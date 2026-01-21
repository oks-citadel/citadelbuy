# Schema Update Instructions for Review Photo Support

## Required Schema Change

To enable photo review support, add the following field to the `Review` model in `prisma/schema.prisma`:

### Location
File: `organization/apps/api/prisma/schema.prisma`
Line: After line 426 (after `comment` field)

### Code to Add
```prisma
  images             String[]     @default([]) // Array of image URLs for photo reviews
```

### Complete Updated Review Model
```prisma
model Review {
  id                 String       @id @default(uuid())
  userId             String
  productId          String
  rating             Int // 1-5
  comment            String?
  images             String[]     @default([]) // Array of image URLs for photo reviews
  isVerifiedPurchase Boolean      @default(false)
  helpfulCount       Int          @default(0)
  status             ReviewStatus @default(APPROVED)
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  // Relations
  user         User            @relation(fields: [userId], references: [id])
  product      Product         @relation(fields: [productId], references: [id], onDelete: Cascade)
  votes        ReviewVote[]
  helpfulVotes ReviewHelpful[]

  @@unique([userId, productId])
  @@index([productId])
  @@index([status])
  @@map("reviews")
}
```

## Migration Steps

After updating the schema, run the following commands:

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name add-review-images-support

# Or for production
npx prisma migrate deploy
```

## Affected Files

The following files have already been updated to support photo reviews:
- `src/modules/reviews/dto/create-review.dto.ts` - Added `images` field
- `src/modules/reviews/reviews.service.ts` - Updated `create()` method to handle images
- `src/modules/reviews/reviews.controller.ts` - Added filters for photo reviews

Once the schema is updated and migration is run, the photo review feature will be fully functional.
