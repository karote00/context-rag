use neon::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use tantivy::schema::*;
use tantivy::{doc, Index, IndexWriter, ReloadPolicy};
use walkdir::WalkDir;

#[derive(Serialize, Deserialize, Debug)]
pub struct IndexConfig {
    pub include: Vec<String>,
    pub exclude: Vec<String>,
    pub storage_path: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DocumentChunk {
    pub file_path: String,
    pub content: String,
    pub chunk_index: usize,
    pub file_hash: String,
    pub modified_time: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IndexResult {
    pub indexed_files: usize,
    pub total_chunks: usize,
    pub processing_time_ms: u128,
}

pub struct ContextRagIndexer {
    schema: Schema,
    index: Index,
    writer: IndexWriter,
}

impl ContextRagIndexer {
    pub fn new(storage_path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let mut schema_builder = Schema::builder();
        
        schema_builder.add_text_field("file_path", TEXT | STORED);
        schema_builder.add_text_field("content", TEXT);
        schema_builder.add_u64_field("chunk_index", INDEXED | STORED);
        schema_builder.add_text_field("file_hash", STRING | STORED);
        schema_builder.add_i64_field("modified_time", INDEXED | STORED);
        
        let schema = schema_builder.build();
        
        let index_path = Path::new(storage_path);
        fs::create_dir_all(index_path)?;
        
        let index = Index::create_in_dir(index_path, schema.clone())?;
        let writer = index.writer(50_000_000)?; // 50MB buffer
        
        Ok(ContextRagIndexer {
            schema,
            index,
            writer,
        })
    }

    pub fn index_directory(&mut self, config: &IndexConfig) -> Result<IndexResult, Box<dyn std::error::Error>> {
        let start_time = std::time::Instant::now();
        let mut indexed_files = 0;
        let mut total_chunks = 0;

        let file_path_field = self.schema.get_field("file_path").unwrap();
        let content_field = self.schema.get_field("content").unwrap();
        let chunk_index_field = self.schema.get_field("chunk_index").unwrap();
        let file_hash_field = self.schema.get_field("file_hash").unwrap();
        let modified_time_field = self.schema.get_field("modified_time").unwrap();

        for entry in WalkDir::new(".").into_iter().filter_map(|e| e.ok()) {
            let path = entry.path();
            
            if !self.should_include_file(path, config) {
                continue;
            }

            if let Ok(content) = fs::read_to_string(path) {
                let file_hash = self.calculate_file_hash(&content);
                let modified_time = entry.metadata()?.modified()?
                    .duration_since(std::time::UNIX_EPOCH)?
                    .as_secs() as i64;

                let chunks = self.chunk_content(&content);
                
                for (chunk_index, chunk) in chunks.iter().enumerate() {
                    let doc = doc!(
                        file_path_field => path.to_string_lossy().to_string(),
                        content_field => chunk.clone(),
                        chunk_index_field => chunk_index as u64,
                        file_hash_field => file_hash.clone(),
                        modified_time_field => modified_time
                    );
                    
                    self.writer.add_document(doc)?;
                    total_chunks += 1;
                }
                
                indexed_files += 1;
            }
        }

        self.writer.commit()?;
        
        let processing_time = start_time.elapsed().as_millis();
        
        Ok(IndexResult {
            indexed_files,
            total_chunks,
            processing_time_ms: processing_time,
        })
    }

    fn should_include_file(&self, path: &Path, config: &IndexConfig) -> bool {
        let path_str = path.to_string_lossy();
        
        // Check exclusions first
        for exclude_pattern in &config.exclude {
            if path_str.contains(exclude_pattern) {
                return false;
            }
        }
        
        // Check inclusions
        for include_pattern in &config.include {
            if include_pattern.ends_with('/') {
                // Directory pattern
                if path_str.starts_with(include_pattern) {
                    return true;
                }
            } else if include_pattern.starts_with("*.") {
                // Extension pattern
                let ext = &include_pattern[2..];
                if path.extension().map_or(false, |e| e == ext) {
                    return true;
                }
            } else if path_str.contains(include_pattern) {
                // Filename pattern
                return true;
            }
        }
        
        false
    }

    fn chunk_content(&self, content: &str) -> Vec<String> {
        // Simple chunking strategy - split by paragraphs and limit size
        const MAX_CHUNK_SIZE: usize = 1000;
        let mut chunks = Vec::new();
        let mut current_chunk = String::new();
        
        for line in content.lines() {
            if current_chunk.len() + line.len() > MAX_CHUNK_SIZE && !current_chunk.is_empty() {
                chunks.push(current_chunk.trim().to_string());
                current_chunk = String::new();
            }
            
            current_chunk.push_str(line);
            current_chunk.push('\n');
        }
        
        if !current_chunk.trim().is_empty() {
            chunks.push(current_chunk.trim().to_string());
        }
        
        if chunks.is_empty() {
            chunks.push(content.to_string());
        }
        
        chunks
    }

    fn calculate_file_hash(&self, content: &str) -> String {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(content.as_bytes());
        hex::encode(hasher.finalize())
    }
}

// Neon bindings for Node.js
fn create_index(mut cx: FunctionContext) -> JsResult<JsString> {
    let storage_path = cx.argument::<JsString>(0)?.value(&mut cx);
    
    match ContextRagIndexer::new(&storage_path) {
        Ok(_) => Ok(cx.string("Index created successfully")),
        Err(e) => cx.throw_error(format!("Failed to create index: {}", e)),
    }
}

fn index_directory(mut cx: FunctionContext) -> JsResult<JsString> {
    let storage_path = cx.argument::<JsString>(0)?.value(&mut cx);
    let config_json = cx.argument::<JsString>(1)?.value(&mut cx);
    
    let config: IndexConfig = match serde_json::from_str(&config_json) {
        Ok(config) => config,
        Err(e) => return cx.throw_error(format!("Invalid config JSON: {}", e)),
    };
    
    match ContextRagIndexer::new(&storage_path) {
        Ok(mut indexer) => {
            match indexer.index_directory(&config) {
                Ok(result) => {
                    let result_json = serde_json::to_string(&result).unwrap();
                    Ok(cx.string(result_json))
                }
                Err(e) => cx.throw_error(format!("Indexing failed: {}", e)),
            }
        }
        Err(e) => cx.throw_error(format!("Failed to create indexer: {}", e)),
    }
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("createIndex", create_index)?;
    cx.export_function("indexDirectory", index_directory)?;
    Ok(())
}