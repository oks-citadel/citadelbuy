#!/usr/bin/env python3
"""
Script to fix the order of indexes - move them before @@map directive.
"""

import re

def fix_index_order(schema_path):
    """Fix index order in schema file."""
    with open(schema_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Pattern to find models with indexes after @@map
    # This will find: @@map("...") followed by @@index lines
    pattern = r'(  @@map\([^\)]+\))\n((?:  @@index\([^\)]+\)\n?)+)'

    def reorder_match(match):
        map_line = match.group(1)
        index_lines = match.group(2).strip()

        # Reorder: indexes first, then map
        return f'{index_lines}\n{map_line}'

    content = re.sub(pattern, reorder_match, content)

    if content != original_content:
        with open(schema_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Fixed index ordering in schema file")
        return True
    else:
        print("No fixes needed - indexes are in correct order")
        return False

def main():
    schema_path = r'C:\Users\citad\OneDrive\Documents\citadelbuy-master\organization\apps\api\prisma\schema.prisma'
    print("Fixing index order in Prisma schema...")
    print("=" * 80)
    fix_index_order(schema_path)

if __name__ == '__main__':
    main()
