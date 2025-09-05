#!/usr/bin/env python3
"""
Test script for AI extraction service
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add backend to Python path
sys.path.insert(0, os.path.dirname(__file__))

from services.ai_extraction import AIExtractionService, AIExtractionError


def test_extraction():
    """Test AI extraction with a real product image."""
    
    # Check if OpenAI API key is available
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY not found in environment variables")
        print("Please set your OpenAI API key in .env file:")
        print("OPENAI_API_KEY=sk-your-key-here")
        return False
    
    print("🤖 Testing AI Extraction Service...")
    print(f"Using OpenAI API key: {api_key[:20]}...{api_key[-4:]}")
    
    # Test image URLs (real product images)
    test_images = [
        {
            "url": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1958&q=80",
            "context": "https://example.com/modern-chair",
            "title": "Modern Accent Chair",
            "expected_category": "Chair"
        },
        {
            "url": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1950&q=80",
            "context": "https://example.com/sofa",
            "title": "Living Room Sofa",
            "expected_category": "Sofa"
        }
    ]
    
    try:
        # Initialize service
        service = AIExtractionService(api_key)
        
        success_count = 0
        total_tests = len(test_images)
        
        for i, test_case in enumerate(test_images, 1):
            print(f"\n📸 Test {i}/{total_tests}: {test_case['title']}")
            print(f"Image URL: {test_case['url'][:80]}...")
            
            try:
                # Extract product data
                result = service.extract_from_image_url(
                    image_url=test_case["url"],
                    context_url=test_case.get("context"),
                    page_title=test_case.get("title")
                )
                
                # Display results
                print(f"✅ Extraction successful!")
                print(f"  Title: {result.title}")
                print(f"  Vendor: {result.vendor}")
                print(f"  Price: ${result.price} {result.currency}" if result.price else "  Price: Not detected")
                print(f"  Category: {result.category}")
                print(f"  Material: {result.material}")
                print(f"  Color: {result.colour_hex}")
                print(f"  Description: {result.description[:100]}..." if result.description and len(result.description) > 100 else f"  Description: {result.description}")
                print(f"  Features: {result.features}")
                
                success_count += 1
                
                # Basic validation
                if result.title and len(result.title) > 2:
                    print("  ✓ Title extraction looks good")
                else:
                    print("  ⚠️  Title extraction could be better")
                
                if result.category:
                    print("  ✓ Category detected")
                else:
                    print("  ⚠️  No category detected")
                
                if result.colour_hex and result.colour_hex.startswith('#'):
                    print("  ✓ Color extraction looks good")
                else:
                    print("  ⚠️  Color extraction could be better")
                    
            except AIExtractionError as e:
                print(f"❌ AI Extraction Error: {e}")
            except Exception as e:
                print(f"❌ Unexpected Error: {e}")
                import traceback
                traceback.print_exc()
        
        # Summary
        print(f"\n📊 Test Summary:")
        print(f"Successful extractions: {success_count}/{total_tests}")
        accuracy = (success_count / total_tests) * 100 if total_tests > 0 else 0
        print(f"Success rate: {accuracy:.1f}%")
        
        if accuracy >= 85:
            print("✅ AI extraction accuracy meets requirements (>85%)")
            return True
        else:
            print("⚠️  AI extraction accuracy below target (85%)")
            return False
            
    except Exception as e:
        print(f"❌ Service initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_extraction()
    sys.exit(0 if success else 1)