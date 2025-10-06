const OpenAI = require('openai');

class OpenAIEmbedder {
  constructor(apiKey, model = 'text-embedding-ada-002') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generateEmbeddings(texts) {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      throw new Error(`OpenAI embedding failed: ${error.message}`);
    }
  }

  async embedText(text) {
    const embeddings = await this.generateEmbeddings([text]);
    return embeddings[0];
  }
}

// Result transformers
const transformers = {
  'openai-summary': {
    name: 'OpenAI Summary',
    description: 'Generate AI-powered summary of search results',
    transform: async (results, config) => {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable not set');
      }

      const client = new OpenAI({ apiKey });
      
      // Prepare context from results
      const context = results.slice(0, 5).map(r => 
        `File: ${r.file_path}\nContent: ${r.content}`
      ).join('\n\n---\n\n');

      try {
        const response = await client.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that summarizes search results from a codebase. Provide a concise, technical summary.'
            },
            {
              role: 'user',
              content: `Please summarize these search results:\n\n${context}`
            }
          ],
          max_tokens: 500
        });

        return {
          format: 'openai-summary',
          summary: response.choices[0].message.content,
          original_results: results.length,
          processed_results: Math.min(5, results.length),
          model: 'gpt-3.5-turbo',
          generated_at: new Date().toISOString()
        };

      } catch (error) {
        throw new Error(`OpenAI summary failed: ${error.message}`);
      }
    }
  },

  'openai-explain': {
    name: 'OpenAI Code Explanation',
    description: 'Generate AI explanations for code results',
    transform: async (results, config) => {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable not set');
      }

      const client = new OpenAI({ apiKey });
      
      const explanations = [];
      
      // Process top 3 results
      for (const result of results.slice(0, 3)) {
        try {
          const response = await client.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'You are a code expert. Explain what this code does in simple terms.'
              },
              {
                role: 'user',
                content: `File: ${result.file_path}\n\nCode:\n${result.content}`
              }
            ],
            max_tokens: 200
          });

          explanations.push({
            file_path: result.file_path,
            similarity: result.similarity,
            explanation: response.choices[0].message.content,
            original_content: result.content
          });

        } catch (error) {
          explanations.push({
            file_path: result.file_path,
            similarity: result.similarity,
            explanation: `Error generating explanation: ${error.message}`,
            original_content: result.content
          });
        }
      }

      return {
        format: 'openai-explain',
        explanations: explanations,
        model: 'gpt-3.5-turbo',
        generated_at: new Date().toISOString()
      };
    }
  }
};

// Embedder interface
const embedders = {
  'openai': {
    name: 'OpenAI Embeddings',
    description: 'Use OpenAI text-embedding-ada-002 for embeddings',
    create: (config) => {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable not set');
      }
      return new OpenAIEmbedder(apiKey, config.model || 'text-embedding-ada-002');
    }
  }
};

module.exports = {
  name: 'OpenAI Plugin',
  version: '0.1.0',
  description: 'OpenAI integration for embeddings and AI-powered transformers',
  transformers,
  embedders
};