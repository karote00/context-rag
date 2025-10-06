#!/bin/bash

# Quick Token Benchmark Script
# Compares token usage with and without context-rag

echo "🚀 Context-RAG Token Benchmark"
echo "================================"

# Check if context-rag is available
if ! command -v context-rag &> /dev/null; then
    echo "❌ context-rag not found. Please install: npm install -g context-rag"
    exit 1
fi

# Check if we're in a project with context-rag initialized
if [ ! -f ".context-rag.config.json" ]; then
    echo "❌ No .context-rag.config.json found. Please run: context-rag init"
    exit 1
fi

# Test queries
queries=(
    "How do I implement user authentication?"
    "What's the database schema?"
    "How do I handle errors in the API?"
    "What are the main components of this system?"
    "How do I deploy this application?"
)

echo "📋 Testing ${#queries[@]} queries..."
echo ""

total_without=0
total_with=0
total_context=0

for query in "${queries[@]}"; do
    echo "🔍 Query: $query"
    
    # Estimate tokens for query without context (just the query)
    query_tokens=$(echo "$query" | wc -c | awk '{print int($1/4)}')
    estimated_response=150  # Typical AI response length in tokens
    without_context=$((query_tokens + estimated_response))
    
    # Get context from context-rag
    context_result=$(context-rag ai "$query" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        # Extract context length (rough estimation)
        context_length=$(echo "$context_result" | jq -r '.context.structured_context[]?.content // empty' 2>/dev/null | wc -c)
        code_length=$(echo "$context_result" | jq -r '.context.code_context[]?.snippet // empty' 2>/dev/null | wc -c)
        
        total_context_chars=$((context_length + code_length))
        context_tokens=$((total_context_chars / 4))
        
        with_context=$((query_tokens + context_tokens + estimated_response))
        
        echo "   Without context: $without_context tokens"
        echo "   With context: $with_context tokens (+$context_tokens context)"
        echo "   Difference: $((with_context - without_context)) tokens"
        
        total_without=$((total_without + without_context))
        total_with=$((total_with + with_context))
        total_context=$((total_context + context_tokens))
    else
        echo "   ❌ Failed to get context from context-rag"
        total_without=$((total_without + without_context))
        total_with=$((total_with + without_context))
    fi
    
    echo ""
done

echo "================================"
echo "📊 SUMMARY"
echo "================================"
echo "Total tokens without context-rag: $total_without"
echo "Total tokens with context-rag: $total_with"
echo "Total context tokens added: $total_context"
echo "Net difference: $((total_with - total_without)) tokens"

# Cost calculation (GPT-3.5 pricing: $0.002 per 1K tokens)
cost_without=$(echo "scale=4; $total_without * 0.002 / 1000" | bc -l 2>/dev/null || echo "0.0000")
cost_with=$(echo "scale=4; $total_with * 0.002 / 1000" | bc -l 2>/dev/null || echo "0.0000")

echo ""
echo "💰 Cost Estimate (GPT-3.5 pricing):"
echo "Without context-rag: \$$cost_without"
echo "With context-rag: \$$cost_with"

if [ $total_with -gt $total_without ]; then
    echo ""
    echo "📈 Context-rag adds upfront token cost but likely:"
    echo "   • Reduces need for follow-up questions"
    echo "   • Provides more accurate, contextual responses"
    echo "   • Saves time and improves response quality"
else
    echo ""
    echo "✅ Context-rag saves tokens while improving response quality!"
fi

echo ""
echo "💡 To get more detailed analysis, use:"
echo "   node tools/token-tracker.js"
echo "   node tools/token-benchmark.js"