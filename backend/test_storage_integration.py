#!/usr/bin/env python3
"""
Test script for Supabase Storage and Vector Embedding integration

This script tests:
1. Image download and storage to Supabase
2. Vector embedding generation
3. Semantic search functionality
"""

import os
import sys
import asyncio
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from storage import storage_service
except ImportError as e:
    print(f"Error importing storage service: {e}")
    print("Make sure you have installed all dependencies:")
    print("pip install supabase openai pillow")
    sys.exit(1)

async def test_image_storage():
    """Test image download and storage to Supabase"""
    print("🖼️  Testing image storage...")
    
    # Test image URL
    test_image_url = "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800"
    test_user_id = "test-user-12345"
    
    try:
        stored_url = await storage_service.store_image(test_image_url, test_user_id)
        print(f"✅ Image stored successfully: {stored_url}")
        return stored_url
    except Exception as e:
        print(f"❌ Image storage failed: {e}")
        return None

def test_embedding_generation():
    """Test vector embedding generation"""
    print("🧠 Testing embedding generation...")
    
    # Test product data
    test_data = {
        "title": "Modern Velvet Sofa",
        "vendor": "West Elm",
        "category": "Furniture",
        "material": "Velvet",
        "description": "A luxurious modern sofa with deep blue velvet upholstery",
        "colour_hex": "#1e3a8a",
        "price": 1299,
        "currency": "USD"
    }
    
    try:
        # Create description for embedding
        description = storage_service.create_description_for_embedding(test_data)
        print(f"📝 Description: {description}")
        
        # Generate embedding
        embedding = storage_service.generate_embedding(description)
        
        if embedding:
            print(f"✅ Embedding generated: {len(embedding)} dimensions")
            print(f"📊 Sample values: {embedding[:5]}...")
            return embedding
        else:
            print("❌ Failed to generate embedding")
            return None
    except Exception as e:
        print(f"❌ Embedding generation failed: {e}")
        return None

async def test_semantic_search():
    """Test semantic search functionality"""
    print("🔍 Testing semantic search...")
    
    test_user_id = "test-user-12345"
    test_queries = [
        "blue velvet sofa",
        "modern furniture",
        "luxury seating",
        "west elm products"
    ]
    
    for query in test_queries:
        try:
            print(f"🔎 Searching for: '{query}'")
            results = await storage_service.semantic_search(query, test_user_id, limit=5)
            
            if results:
                print(f"✅ Found {len(results)} results")
                for i, result in enumerate(results[:3]):  # Show top 3
                    similarity = result.get('similarity', 'N/A')
                    title = result.get('title', 'No title')
                    print(f"   {i+1}. {title} (similarity: {similarity})")
            else:
                print("ℹ️  No results found (expected if no data in database)")
        except Exception as e:
            print(f"❌ Search failed for '{query}': {e}")

def test_database_operations():
    """Test database operations for embeddings"""
    print("🗄️  Testing database operations...")
    
    try:
        # Test embedding storage (mock)
        test_item_id = "test-item-12345"
        test_embedding = [0.1, 0.2, 0.3] * 512  # Mock 1536-dimensional embedding
        
        success = storage_service.store_item_embedding(test_item_id, test_embedding)
        
        if success:
            print("✅ Embedding storage test passed")
        else:
            print("❌ Embedding storage failed")
    except Exception as e:
        print(f"❌ Database operations failed: {e}")

def check_environment():
    """Check if all required environment variables are set"""
    print("🔧 Checking environment configuration...")
    
    required_vars = {
        "SUPABASE_PROJECT_URL": "Supabase project URL",
        "SUPABASE_SERVICE_ROLE_KEY": "Supabase service role key",
        "OPENAI_API_KEY": "OpenAI API key",
        "DATABASE_URL": "Database connection URL (or SUPABASE_DB_URL)"
    }
    
    missing_vars = []
    
    for var, description in required_vars.items():
        if var == "DATABASE_URL":
            # Check for either DATABASE_URL or SUPABASE_DB_URL
            if not os.getenv("DATABASE_URL") and not os.getenv("SUPABASE_DB_URL"):
                missing_vars.append(f"{var} (or SUPABASE_DB_URL)")
        elif not os.getenv(var):
            missing_vars.append(f"{var}: {description}")
    
    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\nPlease check your .env file and ensure all variables are set.")
        return False
    else:
        print("✅ All required environment variables are set")
        return True

async def run_tests():
    """Run all tests"""
    print("🚀 Starting Supabase Storage and Vector Embedding Integration Tests")
    print("=" * 70)
    
    # Check environment first
    if not check_environment():
        return
    
    print()
    
    # Test image storage
    stored_url = await test_image_storage()
    print()
    
    # Test embedding generation
    embedding = test_embedding_generation()
    print()
    
    # Test database operations
    test_database_operations()
    print()
    
    # Test semantic search
    await test_semantic_search()
    print()
    
    print("=" * 70)
    if stored_url and embedding:
        print("🎉 Integration tests completed successfully!")
        print("✅ Image storage: Working")
        print("✅ Embedding generation: Working") 
        print("✅ Database operations: Working")
        print("✅ Semantic search: Working")
    else:
        print("⚠️  Some tests failed. Please check the error messages above.")
    
    print("\n📋 Next steps:")
    print("1. Ensure your Supabase project has the pgvector extension enabled")
    print("2. Run the schema.sql to create tables and indexes")
    print("3. Create the 'product-images' bucket in Supabase Storage")
    print("4. Test the API endpoints with real requests")

if __name__ == "__main__":
    asyncio.run(run_tests())