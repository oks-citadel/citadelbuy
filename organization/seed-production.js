const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  const vendorUser = await prisma.user.findFirst({
    where: { role: "VENDOR" }
  });

  if (!vendorUser) {
    console.error("No VENDOR user found!");
    process.exit(1);
  }
  console.log("Found vendor user:", vendorUser.id);

  let vendor = await prisma.vendor.findUnique({
    where: { id: vendorUser.id }
  });

  if (!vendor) {
    console.log("Creating vendor entity...");
    vendor = await prisma.vendor.create({
      data: {
        id: vendorUser.id,
        name: "TechStore Vendor",
        slug: "techstore-vendor",
        description: "Technology and Electronics Store",
        status: "ACTIVE",
        isVerified: true,
        isActive: true,
      }
    });
    console.log("Vendor entity created:", vendor.id);
  } else {
    console.log("Vendor entity exists:", vendor.id);
  }

  const categories = await prisma.category.findMany();
  console.log("Found", categories.length, "categories");

  const electronics = categories.find(c => c.slug === "electronics");
  const clothing = categories.find(c => c.slug === "clothing");
  const books = categories.find(c => c.slug === "books");

  const existing = await prisma.product.count();
  if (existing >= 5) {
    console.log("Already have", existing, "products. Done!");
    return;
  }

  console.log("Creating products...");
  const products = [
    {
      name: "Professional Laptop Pro 15",
      slug: "professional-laptop-pro-15",
      description: "High-performance laptop with 16GB RAM, 512GB SSD, and Intel i7 processor. Perfect for professionals.",
      price: 1299.99,
      stock: 25,
      images: ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800"],
      vendorId: vendorUser.id,
      categoryId: electronics.id,
    },
    {
      name: "SmartPhone X Pro",
      slug: "smartphone-x-pro",
      description: "6.5 inch OLED display, 128GB storage, 5G capable with triple camera system.",
      price: 899.99,
      stock: 50,
      images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800"],
      vendorId: vendorUser.id,
      categoryId: electronics.id,
    },
    {
      name: "Wireless Noise-Cancelling Headphones",
      slug: "wireless-noise-cancelling-headphones",
      description: "Premium audio quality with active noise cancellation and 30-hour battery life.",
      price: 299.99,
      stock: 75,
      images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"],
      vendorId: vendorUser.id,
      categoryId: electronics.id,
    },
    {
      name: "Classic Cotton T-Shirt",
      slug: "classic-cotton-tshirt",
      description: "100 percent premium cotton t-shirt. Comfortable and durable for everyday wear.",
      price: 29.99,
      stock: 200,
      images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800"],
      vendorId: vendorUser.id,
      categoryId: clothing.id,
    },
    {
      name: "Slim Fit Denim Jeans",
      slug: "slim-fit-denim-jeans",
      description: "Modern slim fit jeans with stretch denim. Classic 5-pocket design.",
      price: 79.99,
      stock: 150,
      images: ["https://images.unsplash.com/photo-1542272604-787c3835535d?w=800"],
      vendorId: vendorUser.id,
      categoryId: clothing.id,
    },
    {
      name: "The Art of Programming",
      slug: "art-of-programming",
      description: "Comprehensive guide to software development best practices and design patterns.",
      price: 49.99,
      stock: 80,
      images: ["https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800"],
      vendorId: vendorUser.id,
      categoryId: books.id,
    },
  ];

  for (const product of products) {
    try {
      const exists = await prisma.product.findUnique({ where: { slug: product.slug } });
      if (!exists) {
        await prisma.product.create({ data: product });
        console.log("Created:", product.name);
      } else {
        console.log("Exists:", product.name);
      }
    } catch (e) {
      console.error("Error creating", product.name, ":", e.message);
    }
  }

  const final = await prisma.product.count();
  console.log("Total products:", final);
}

main()
  .then(() => console.log("Done!"))
  .catch(e => console.error("Error:", e))
  .finally(() => prisma.$disconnect());
