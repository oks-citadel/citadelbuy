#!/usr/bin/env python3
"""
Script to fix formatting issues in the schema file.
"""

import re

def fix_schema_format(schema_path):
    """Fix formatting in schema file."""
    with open(schema_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Fix: @@index lines without proper indentation
    content = re.sub(r'\n@@index\(', r'\n  @@index(', content)

    # Fix: @@map lines that are on same line as closing brace
    content = re.sub(r'  @@map\(([^\)]+)\)\}', r'  @@map(\1)\n}', content)

    # Fix: ensure proper spacing before closing braces
    content = re.sub(r'(\n  @@(?:index|map|unique|id)\([^\)]+\))(\n})', r'\1\2', content)

    if content != original_content:
        with open(schema_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Fixed schema formatting")
        return True
    else:
        print("No formatting fixes needed")
        return False

def main():
    schema_path = r'C:\Users\citad\OneDrive\Documents\citadelbuy-master\organization\apps\api\prisma\schema.prisma'
    print("Fixing schema formatting...")
    print("=" * 80)
    fix_schema_format(schema_path)

if __name__ == '__main__':
    main()
