use std::env;
use std::io::{self, Read};
use serde_json::{json, Value};
use anyhow::Result;

fn main() -> Result<()> {
    let args: Vec<String> = env::args().collect();
    
    if args.len() > 1 && args[1] == "--version" {
        println!("context-rag-embedder 0.1.0");
        return Ok(());
    }
    
    // Check if called with --text argument (single text embedding interface)
    if args.len() > 4 && args[1] == "--text" && args[3] == "--model" {
        let text = &args[2];
        let model = &args[4];
        
        let embedding = generate_mock_embedding(text);
        
        let response = json!({
            "embedding": embedding,
            "model": model,
            "engine": "rust"
        });
        
        println!("{}", serde_json::to_string(&response)?);
        return Ok(());
    }
    
    // Check if called with --model argument (context-rag embedder service interface)
    if args.len() > 2 && args[1] == "--model" {
        // Read JSON input from stdin
        let mut input = String::new();
        io::stdin().read_to_string(&mut input)?;
        
        let input_data: Value = serde_json::from_str(&input)?;
        let chunks = input_data["chunks"].as_array()
            .ok_or_else(|| anyhow::anyhow!("Missing 'chunks' array in input"))?;
        
        // Generate embeddings for each chunk
        let mut chunk_embeddings = Vec::new();
        
        for chunk in chunks {
            let content = chunk["content"].as_str().unwrap_or("");
            let embedding = generate_mock_embedding(content);
            
            let chunk_with_embedding = json!({
                "content": content,
                "embedding": embedding,
                "file_path": chunk.get("file_path").unwrap_or(&json!("")),
                "chunk_index": chunk.get("chunk_index").unwrap_or(&json!(0))
            });
            
            chunk_embeddings.push(chunk_with_embedding);
        }
        
        let response = json!({
            "chunks": chunk_embeddings,
            "model": args[2],
            "engine": "rust"
        });
        
        println!("{}", serde_json::to_string(&response)?);
        return Ok(());
    }
    
    // Legacy embed command interface
    if args.len() > 1 && args[1] == "embed" {
        // Read JSON input from stdin
        let mut input = String::new();
        io::stdin().read_to_string(&mut input)?;
        
        let input_data: Value = serde_json::from_str(&input)?;
        let texts = input_data["texts"].as_array()
            .ok_or_else(|| anyhow::anyhow!("Missing 'texts' array in input"))?;
        
        // For now, return mock embeddings (384-dimensional vectors like all-MiniLM-L6-v2)
        let mut embeddings = Vec::new();
        
        for text in texts {
            let text_str = text.as_str().unwrap_or("");
            // Generate a simple hash-based mock embedding
            let embedding = generate_mock_embedding(text_str);
            embeddings.push(embedding);
        }
        
        let response = json!({
            "embeddings": embeddings,
            "model": "sentence-transformers/all-MiniLM-L6-v2",
            "engine": "rust"
        });
        
        println!("{}", serde_json::to_string(&response)?);
        return Ok(());
    }
    
    eprintln!("Usage: context-rag-embedder [--version | --text <text> --model <model> | --model <model_name> | embed]");
    eprintln!("For --text command: returns single embedding for the provided text");
    eprintln!("For --model command, provide JSON input via stdin with format:");
    eprintln!(r#"{{"chunks": [{{"content": "text", "file_path": "path", "chunk_index": 0}}, ...]}}"#);
    eprintln!("For embed command, provide JSON input via stdin with format:");
    eprintln!(r#"{{"texts": ["text1", "text2", ...]}}"#);
    std::process::exit(1);
}

fn generate_mock_embedding(text: &str) -> Vec<f32> {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    
    // Create a deterministic but varied embedding based on text content
    let mut hasher = DefaultHasher::new();
    text.hash(&mut hasher);
    let base_hash = hasher.finish();
    
    let mut embedding = Vec::with_capacity(384);
    
    // Generate 384-dimensional vector with values between -1 and 1
    for i in 0..384 {
        let mut hasher = DefaultHasher::new();
        (base_hash.wrapping_add(i as u64)).hash(&mut hasher);
        let hash_val = hasher.finish();
        
        // Convert to float between -1 and 1
        let normalized = (hash_val as f64 / u64::MAX as f64) * 2.0 - 1.0;
        embedding.push(normalized as f32);
    }
    
    // Normalize the vector to unit length (like real embeddings)
    let magnitude: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
    if magnitude > 0.0 {
        for val in &mut embedding {
            *val /= magnitude;
        }
    }
    
    embedding
}