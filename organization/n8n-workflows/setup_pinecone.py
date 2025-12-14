"""
Pinecone Setup Script for Broxiva AI Chatbot
Initializes vector database and ingests knowledge base
"""

import os
import sys
from typing import List, Dict
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Check for required dependencies
try:
    import pinecone
    from openai import OpenAI
except ImportError:
    print("Error: Required packages not installed.")
    print("Run: pip install pinecone-client openai python-dotenv")
    sys.exit(1)

# Configuration
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT", "us-west1-gcp")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "broxiva-products")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
BROXIVA_API_KEY = os.getenv("BROXIVA_API_KEY")
BROXIVA_API_URL = os.getenv("BROXIVA_API_URL", "https://api.broxiva.com/v1")

# Validate environment variables
if not all([PINECONE_API_KEY, OPENAI_API_KEY, BROXIVA_API_KEY]):
    print("Error: Missing required environment variables")
    print("Required: PINECONE_API_KEY, OPENAI_API_KEY, BROXIVA_API_KEY")
    sys.exit(1)

# Initialize clients
client = OpenAI(api_key=OPENAI_API_KEY)
pinecone.init(api_key=PINECONE_API_KEY, environment=PINECONE_ENVIRONMENT)


def create_embedding(text: str) -> List[float]:
    """Generate embedding using OpenAI text-embedding-ada-002"""
    try:
        response = client.embeddings.create(
            input=text,
            model="text-embedding-ada-002"
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Error creating embedding: {e}")
        return None


def create_pinecone_index():
    """Create Pinecone index if it doesn't exist"""
    existing_indexes = pinecone.list_indexes()

    if PINECONE_INDEX_NAME in existing_indexes:
        print(f"✓ Index '{PINECONE_INDEX_NAME}' already exists")
        return pinecone.Index(PINECONE_INDEX_NAME)

    print(f"Creating index '{PINECONE_INDEX_NAME}'...")
    pinecone.create_index(
        name=PINECONE_INDEX_NAME,
        dimension=1536,  # OpenAI ada-002 embedding size
        metric="cosine",
        pod_type="p1.x1"
    )
    print(f"✓ Index '{PINECONE_INDEX_NAME}' created successfully")
    return pinecone.Index(PINECONE_INDEX_NAME)


def fetch_broxiva_data(endpoint: str) -> List[Dict]:
    """Fetch data from Broxiva API"""
    try:
        response = requests.get(
            f"{BROXIVA_API_URL}/{endpoint}",
            headers={"X-API-Key": BROXIVA_API_KEY}
        )
        response.raise_for_status()
        return response.json().get('data', [])
    except Exception as e:
        print(f"Warning: Could not fetch {endpoint}: {e}")
        return []


def ingest_products(index, products: List[Dict]):
    """Ingest product data into Pinecone"""
    if not products:
        print("No products to ingest")
        return

    vectors = []
    print(f"Processing {len(products)} products...")

    for i, product in enumerate(products):
        # Create rich searchable text
        text = f"""
        Product Name: {product.get('name', 'Unknown')}
        Category: {product.get('category', 'General')}
        Brand: {product.get('brand', 'N/A')}
        Description: {product.get('description', '')}
        Price: ${product.get('price', 0)}
        Stock Status: {product.get('stock_status', 'Unknown')}
        Features: {', '.join(product.get('features', []))}
        Specifications: {product.get('specifications', '')}
        Average Rating: {product.get('avg_rating', 'N/A')} stars
        Review Count: {product.get('review_count', 0)} reviews
        Tags: {', '.join(product.get('tags', []))}
        """.strip()

        # Generate embedding
        embedding = create_embedding(text)
        if not embedding:
            print(f"  Skipping product {product.get('id', i)} - embedding failed")
            continue

        # Prepare vector
        vectors.append({
            'id': f"product_{product.get('id', i)}",
            'values': embedding,
            'metadata': {
                'type': 'product',
                'product_id': str(product.get('id', '')),
                'name': product.get('name', 'Unknown'),
                'category': product.get('category', 'General'),
                'price': float(product.get('price', 0)),
                'url': product.get('url', ''),
                'stock_status': product.get('stock_status', 'Unknown'),
                'brand': product.get('brand', ''),
                'avg_rating': float(product.get('avg_rating', 0)),
                'image_url': product.get('image_url', '')
            }
        })

        if (i + 1) % 10 == 0:
            print(f"  Processed {i + 1}/{len(products)} products")

    # Upsert in batches of 100
    batch_size = 100
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i+batch_size]
        index.upsert(vectors=batch)
        print(f"  Uploaded batch {i//batch_size + 1}/{(len(vectors)-1)//batch_size + 1}")

    print(f"✓ Ingested {len(vectors)} product vectors")


def ingest_faqs(index, faqs: List[Dict]):
    """Ingest FAQ data into Pinecone"""
    if not faqs:
        print("No FAQs to ingest")
        return

    vectors = []
    print(f"Processing {len(faqs)} FAQs...")

    for i, faq in enumerate(faqs):
        text = f"""
        Question: {faq.get('question', '')}
        Answer: {faq.get('answer', '')}
        Category: {faq.get('category', 'General')}
        Tags: {', '.join(faq.get('tags', []))}
        """.strip()

        embedding = create_embedding(text)
        if not embedding:
            print(f"  Skipping FAQ {faq.get('id', i)} - embedding failed")
            continue

        vectors.append({
            'id': f"faq_{faq.get('id', i)}",
            'values': embedding,
            'metadata': {
                'type': 'faq',
                'question': faq.get('question', ''),
                'answer': faq.get('answer', ''),
                'category': faq.get('category', 'General'),
                'url': faq.get('url', '')
            }
        })

    index.upsert(vectors=vectors)
    print(f"✓ Ingested {len(vectors)} FAQ vectors")


def ingest_policies(index, policies: List[Dict]):
    """Ingest policy documents into Pinecone"""
    if not policies:
        # Create default policies if none exist
        policies = [
            {
                'id': 'return-policy',
                'title': 'Return Policy',
                'content': """
                Broxiva offers a 30-day return policy on most items.
                Items must be in original condition with tags attached.
                Refunds are processed within 5-7 business days.
                Free return shipping for defective items.
                Restocking fee may apply for opened electronics.
                """,
                'category': 'Returns'
            },
            {
                'id': 'shipping-policy',
                'title': 'Shipping Policy',
                'content': """
                Free standard shipping on orders over $50.
                Standard shipping: 5-7 business days.
                Express shipping: 2-3 business days.
                Overnight shipping available for select items.
                International shipping available to select countries.
                """,
                'category': 'Shipping'
            },
            {
                'id': 'warranty-policy',
                'title': 'Warranty Policy',
                'content': """
                All products come with manufacturer warranty.
                Extended warranty available for purchase.
                Warranty claims processed within 48 hours.
                Defective items replaced at no cost.
                Contact support for warranty claims.
                """,
                'category': 'Warranty'
            }
        ]

    vectors = []
    print(f"Processing {len(policies)} policies...")

    for policy in policies:
        text = f"""
        Policy: {policy.get('title', '')}
        Category: {policy.get('category', 'General')}
        Content: {policy.get('content', '')}
        """.strip()

        embedding = create_embedding(text)
        if not embedding:
            continue

        vectors.append({
            'id': f"policy_{policy.get('id', '')}",
            'values': embedding,
            'metadata': {
                'type': 'policy',
                'title': policy.get('title', ''),
                'category': policy.get('category', 'General'),
                'content': policy.get('content', '')
            }
        })

    index.upsert(vectors=vectors)
    print(f"✓ Ingested {len(vectors)} policy vectors")


def test_search(index):
    """Test the vector search"""
    print("\nTesting vector search...")

    test_queries = [
        "wireless headphones under $100",
        "how do I return an item?",
        "what is your shipping policy?"
    ]

    for query in test_queries:
        print(f"\nQuery: '{query}'")
        embedding = create_embedding(query)
        if not embedding:
            continue

        results = index.query(
            vector=embedding,
            top_k=3,
            include_metadata=True
        )

        print(f"  Found {len(results['matches'])} results:")
        for match in results['matches']:
            score = match['score']
            metadata = match['metadata']
            type_name = metadata.get('type', 'unknown')

            if type_name == 'product':
                print(f"    [{score:.3f}] Product: {metadata.get('name', 'Unknown')} - ${metadata.get('price', 0)}")
            elif type_name == 'faq':
                print(f"    [{score:.3f}] FAQ: {metadata.get('question', 'Unknown')[:60]}...")
            elif type_name == 'policy':
                print(f"    [{score:.3f}] Policy: {metadata.get('title', 'Unknown')}")


def main():
    """Main execution function"""
    print("=" * 60)
    print("Broxiva Pinecone Setup")
    print("=" * 60)

    # Step 1: Create index
    print("\n[1/5] Creating Pinecone index...")
    index = create_pinecone_index()

    # Step 2: Fetch data from Broxiva API
    print("\n[2/5] Fetching data from Broxiva API...")
    products = fetch_broxiva_data("products")
    faqs = fetch_broxiva_data("support/faqs")
    policies = fetch_broxiva_data("support/policies")

    # Step 3: Ingest products
    print("\n[3/5] Ingesting products...")
    ingest_products(index, products)

    # Step 4: Ingest FAQs
    print("\n[4/5] Ingesting FAQs...")
    ingest_faqs(index, faqs)

    # Step 5: Ingest policies
    print("\n[5/5] Ingesting policies...")
    ingest_policies(index, policies)

    # Display stats
    print("\n" + "=" * 60)
    stats = index.describe_index_stats()
    print(f"Index Statistics:")
    print(f"  Total vectors: {stats['total_vector_count']}")
    print(f"  Dimension: {stats['dimension']}")
    print("=" * 60)

    # Test search
    test_search(index)

    print("\n✓ Setup complete! Your Pinecone knowledge base is ready.")
    print(f"  Index: {PINECONE_INDEX_NAME}")
    print(f"  Environment: {PINECONE_ENVIRONMENT}")
    print("\nNext steps:")
    print("  1. Configure n8n workflow credentials")
    print("  2. Test the chatbot workflow")
    print("  3. Set up webhook endpoints")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nSetup cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nError during setup: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
