# Plugin Development Guide

Learn how to create custom transformers and embedders for context-rag.

## Plugin System Overview

Context-rag supports two types of plugins:

1. **Transformers** - Process search results into different formats
2. **Embedders** - Generate semantic embeddings for text

## Plugin Structure

### Basic Plugin Structure

```javascript
// my-plugin/index.js
module.exports = {
  name: 'My Custom Plugin',
  version: '1.0.0',
  description: 'Custom transformers and embedders',
  
  // Optional: Transformers
  transformers: {
    'my-transformer': {
      name: 'My Transformer',
      description: 'Custom result transformation',
      transform: async (results, config) => {
        // Transform results here
        return transformedResults;
      }
    }
  },
  
  // Optional: Embedders  
  embedders: {
    'my-embedder': {
      name: 'My Embedder',
      description: 'Custom embedding generation',
      create: (config) => {
        return {
          embedText: async (text) => {
            // Generate embeddings here
            return embedding;
          }
        };
      }
    }
  }
};
```

### Package.json Requirements

```json
{
  "name": "context-rag-plugin-myname",
  "version": "1.0.0",
  "description": "My custom context-rag plugin",
  "main": "index.js",
  "keywords": ["context-rag-plugin"],
  "dependencies": {
    // Your dependencies
  }
}
```

**Important:** The package name must start with `context-rag-plugin-` and include `context-rag-plugin` in keywords.

## Creating Transformers

Transformers process search results and convert them to different formats.

### Transformer Interface

```javascript
{
  name: 'Transformer Name',
  description: 'What this transformer does',
  transform: async (results, config) => {
    // results: Array of search result objects
    // config: Context-rag configuration
    // Return: Transformed data
  }
}
```

### Search Result Object Structure

```javascript
{
  file_path: 'src/auth.js',
  content: 'function login(username, password) { ... }',
  snippet: 'function login(username, password) { ... }',
  similarity: 0.95,
  chunk_index: 0,
  source_type: 'project-file',
  context_category: 'code',
  priority_score: 0,
  is_context: false,
  context_type: null
}
```

### Example: JSON Formatter

```javascript
const transformers = {
  'json-formatter': {
    name: 'JSON Formatter',
    description: 'Format results as clean JSON',
    transform: async (results, config) => {
      return {
        format: 'json',
        query_time: new Date().toISOString(),
        results: results.map(result => ({
          file: result.file_path,
          relevance: result.similarity,
          preview: result.snippet.substring(0, 100) + '...'
        })),
        total: results.length
      };
    }
  }
};
```

### Example: Code Extractor

```javascript
const transformers = {
  'code-extractor': {
    name: 'Code Extractor',
    description: 'Extract and format code snippets',
    transform: async (results, config) => {
      const codeResults = results.filter(r => 
        r.file_path.match(/\.(js|ts|py|java|go|rs)$/)
      );
      
      return {
        format: 'code-extract',
        languages: [...new Set(codeResults.map(r => 
          r.file_path.split('.').pop()
        ))],
        snippets: codeResults.map(result => ({
          language: result.file_path.split('.').pop(),
          file: result.file_path,
          code: result.content,
          relevance: result.similarity
        }))
      };
    }
  }
};
```

### Example: Markdown Generator

```javascript
const transformers = {
  'markdown-generator': {
    name: 'Markdown Generator',
    description: 'Generate markdown documentation',
    transform: async (results, config) => {
      let markdown = '# Search Results\n\n';
      
      results.forEach((result, index) => {
        markdown += `## ${index + 1}. ${result.file_path}\n\n`;
        markdown += `**Relevance:** ${(result.similarity * 100).toFixed(1)}%\n\n`;
        
        if (result.file_path.endsWith('.md')) {
          markdown += result.content + '\n\n';
        } else {
          markdown += '```\n' + result.content + '\n```\n\n';
        }
        
        markdown += '---\n\n';
      });
      
      return {
        format: 'markdown',
        content: markdown,
        metadata: {
          generated_at: new Date().toISOString(),
          total_results: results.length
        }
      };
    }
  }
};
```

## Creating Embedders

Embedders generate semantic embeddings for text content.

### Embedder Interface

```javascript
{
  name: 'Embedder Name',
  description: 'What this embedder does',
  create: (config) => {
    // config: Embedder configuration from .context-rag.config.json
    // Return: Embedder instance
    return {
      embedText: async (text) => {
        // text: String to embed
        // Return: Array of numbers (embedding vector)
      }
    };
  }
}
```

### Example: OpenAI Embedder

```javascript
const OpenAI = require('openai');

const embedders = {
  'openai': {
    name: 'OpenAI Embeddings',
    description: 'Use OpenAI text-embedding-ada-002',
    create: (config) => {
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      return {
        embedText: async (text) => {
          const response = await client.embeddings.create({
            model: config.model || 'text-embedding-ada-002',
            input: text
          });
          
          return response.data[0].embedding;
        }
      };
    }
  }
};
```

### Example: Local Model Embedder

```javascript
const embedders = {
  'local-bert': {
    name: 'Local BERT',
    description: 'Use local BERT model via Python',
    create: (config) => {
      const { spawn } = require('child_process');
      
      return {
        embedText: async (text) => {
          return new Promise((resolve, reject) => {
            const python = spawn('python3', ['-c', `
import torch
from transformers import AutoTokenizer, AutoModel
import json
import sys

model_name = "${config.model || 'bert-base-uncased'}"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModel.from_pretrained(model_name)

text = sys.argv[1]
inputs = tokenizer(text, return_tensors='pt', truncation=True, max_length=512)

with torch.no_grad():
    outputs = model(**inputs)
    embeddings = outputs.last_hidden_state.mean(dim=1).squeeze().tolist()

print(json.dumps(embeddings))
            `, text]);
            
            let output = '';
            python.stdout.on('data', (data) => {
              output += data.toString();
            });
            
            python.on('close', (code) => {
              if (code === 0) {
                resolve(JSON.parse(output));
              } else {
                reject(new Error('Python embedding failed'));
              }
            });
          });
        }
      };
    }
  }
};
```

## Complete Plugin Example

Here's a complete plugin that adds both transformers and embedders:

```javascript
// context-rag-plugin-mycompany/index.js
const axios = require('axios');

module.exports = {
  name: 'MyCompany Context-RAG Plugin',
  version: '1.0.0',
  description: 'Custom transformers and embedders for MyCompany',
  
  transformers: {
    'company-format': {
      name: 'Company Format',
      description: 'Format results according to company standards',
      transform: async (results, config) => {
        return {
          format: 'company-standard',
          timestamp: new Date().toISOString(),
          project: process.cwd().split('/').pop(),
          findings: results.map(result => ({
            source: result.file_path,
            confidence: Math.round(result.similarity * 100),
            excerpt: result.snippet,
            category: result.context_category || 'code'
          })),
          summary: {
            total_sources: results.length,
            avg_confidence: Math.round(
              results.reduce((sum, r) => sum + r.similarity, 0) / results.length * 100
            ),
            categories: [...new Set(results.map(r => r.context_category))]
          }
        };
      }
    },
    
    'security-scan': {
      name: 'Security Scanner',
      description: 'Scan results for potential security issues',
      transform: async (results, config) => {
        const securityPatterns = [
          /password/i,
          /secret/i,
          /api[_-]?key/i,
          /token/i,
          /auth/i
        ];
        
        const securityFindings = results.filter(result => 
          securityPatterns.some(pattern => pattern.test(result.content))
        );
        
        return {
          format: 'security-scan',
          scan_time: new Date().toISOString(),
          total_files_scanned: results.length,
          security_findings: securityFindings.length,
          findings: securityFindings.map(result => ({
            file: result.file_path,
            risk_level: result.content.toLowerCase().includes('password') ? 'high' : 'medium',
            snippet: result.snippet,
            recommendations: [
              'Review for hardcoded credentials',
              'Ensure proper secret management',
              'Consider environment variables'
            ]
          }))
        };
      }
    }
  },
  
  embedders: {
    'company-embedder': {
      name: 'Company Custom Embedder',
      description: 'Use company internal embedding service',
      create: (config) => {
        const serviceUrl = config.service_url || 'http://internal-embeddings.company.com';
        
        return {
          embedText: async (text) => {
            try {
              const response = await axios.post(`${serviceUrl}/embed`, {
                text: text,
                model: config.model || 'company-v1'
              });
              
              return response.data.embedding;
            } catch (error) {
              throw new Error(`Company embedder failed: ${error.message}`);
            }
          }
        };
      }
    }
  }
};
```

## Plugin Installation and Usage

### Local Development

1. Create your plugin directory:
```bash
mkdir context-rag-plugin-myname
cd context-rag-plugin-myname
npm init -y
```

2. Update package.json:
```json
{
  "name": "context-rag-plugin-myname",
  "keywords": ["context-rag-plugin"]
}
```

3. Create your plugin code in `index.js`

4. Test locally:
```bash
# In your project directory
npm link ../context-rag-plugin-myname
context-rag plugins --list
```

### Publishing to npm

```bash
npm publish
```

### Using Plugins

```bash
# Install plugin
npm install context-rag-plugin-myname

# List available transformers
context-rag plugins --list

# Use transformer
context-rag query "search term" --transform myname:my-transformer

# Use in configuration
```

Edit `.context-rag.config.json`:
```json
{
  "embedder": {
    "type": "myname:my-embedder",
    "model": "custom-model"
  }
}
```

## Testing Plugins

### Unit Testing

```javascript
// test/plugin.test.js
const plugin = require('../index.js');

describe('My Plugin', () => {
  test('transformer works correctly', async () => {
    const mockResults = [
      {
        file_path: 'test.js',
        content: 'function test() {}',
        similarity: 0.9
      }
    ];
    
    const transformer = plugin.transformers['my-transformer'];
    const result = await transformer.transform(mockResults, {});
    
    expect(result.format).toBe('my-format');
    expect(result.data).toBeDefined();
  });
  
  test('embedder generates vectors', async () => {
    const embedder = plugin.embedders['my-embedder'];
    const instance = embedder.create({ model: 'test-model' });
    
    const embedding = await instance.embedText('test text');
    
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBeGreaterThan(0);
  });
});
```

### Integration Testing

```bash
# Test with real context-rag
context-rag init
context-rag index
context-rag query "test" --transform my-plugin:my-transformer
```

## Best Practices

### Transformers
1. **Handle empty results gracefully**
2. **Include metadata** (timestamps, versions)
3. **Validate input data** before processing
4. **Use consistent output formats**
5. **Add error handling** for external services

### Embedders
1. **Cache embeddings** when possible
2. **Handle rate limits** for API-based embedders
3. **Normalize vector dimensions**
4. **Provide fallback options**
5. **Document model requirements**

### General
1. **Follow semantic versioning**
2. **Include comprehensive documentation**
3. **Add unit tests**
4. **Handle configuration errors gracefully**
5. **Use descriptive names and descriptions**

## Plugin Examples

Check out the included example plugins:
- `plugins/context-rag-plugin-openai/` - OpenAI integration
- `plugins/context-rag-plugin-rustbert/` - Rust BERT embeddings

## Troubleshooting

### Plugin Not Loading
1. Check package name starts with `context-rag-plugin-`
2. Verify `context-rag-plugin` in keywords
3. Ensure plugin exports correct structure
4. Check for syntax errors in plugin code

### Transformer Errors
1. Validate input data structure
2. Check async/await usage
3. Handle edge cases (empty results)
4. Add error logging

### Embedder Errors
1. Verify external dependencies are installed
2. Check API keys and configuration
3. Handle network timeouts
4. Validate embedding vector format

## Contributing

Want to contribute official plugins? 

1. Fork the context-rag repository
2. Add your plugin to the `plugins/` directory
3. Include tests and documentation
4. Submit a pull request

Official plugins become part of the core distribution and are maintained by the context-rag team.