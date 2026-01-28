import { PrismaClient, CategoryStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface CategorySeed {
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  isFeatured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  children?: CategorySeed[];
}

// Comprehensive category structure with 90+ main categories
const categoryTree: CategorySeed[] = [
  // ==================== FASHION & LIFESTYLE ====================
  {
    name: "Fashion & Lifestyle",
    slug: "fashion-lifestyle",
    description: "Discover the latest trends in clothing, accessories, and lifestyle products",
    iconUrl: "/icons/categories/fashion.svg",
    isFeatured: true,
    metaTitle: "Fashion & Lifestyle | Shop Clothing & Accessories",
    metaDescription: "Browse our extensive collection of fashion items, clothing, shoes, and lifestyle products for men, women, and children.",
    children: [
      {
        name: "Women's Clothing",
        slug: "womens-clothing",
        description: "Trendy and stylish women's apparel",
        isFeatured: true,
        children: [
          { name: "Dresses", slug: "womens-dresses", description: "Casual, formal, and party dresses" },
          { name: "Tops & Blouses", slug: "womens-tops-blouses", description: "Stylish tops and blouses" },
          { name: "Pants & Jeans", slug: "womens-pants-jeans", description: "Comfortable pants and designer jeans" },
          { name: "Skirts", slug: "womens-skirts", description: "Mini, midi, and maxi skirts" },
          { name: "Activewear", slug: "womens-activewear", description: "Workout and athleisure wear" },
          { name: "Swimwear", slug: "womens-swimwear", description: "Bikinis, one-pieces, and cover-ups" },
          { name: "Outerwear", slug: "womens-outerwear", description: "Jackets, coats, and blazers" },
          { name: "Lingerie & Sleepwear", slug: "womens-lingerie-sleepwear", description: "Intimate apparel and nightwear" },
        ]
      },
      {
        name: "Men's Clothing",
        slug: "mens-clothing",
        description: "Quality men's apparel for every occasion",
        isFeatured: true,
        children: [
          { name: "Shirts", slug: "mens-shirts", description: "Casual and formal shirts" },
          { name: "T-Shirts & Polos", slug: "mens-tshirts-polos", description: "Comfortable everyday wear" },
          { name: "Pants & Jeans", slug: "mens-pants-jeans", description: "Trousers, chinos, and denim" },
          { name: "Suits & Blazers", slug: "mens-suits-blazers", description: "Formal and business attire" },
          { name: "Activewear", slug: "mens-activewear", description: "Sports and gym clothing" },
          { name: "Outerwear", slug: "mens-outerwear", description: "Jackets, coats, and hoodies" },
          { name: "Underwear & Socks", slug: "mens-underwear-socks", description: "Essential undergarments" },
        ]
      },
      {
        name: "Shoes",
        slug: "shoes",
        description: "Footwear for every style and occasion",
        isFeatured: true,
        children: [
          { name: "Women's Shoes", slug: "womens-shoes", description: "Heels, flats, and boots" },
          { name: "Men's Shoes", slug: "mens-shoes", description: "Dress shoes, sneakers, and boots" },
          { name: "Sports Shoes", slug: "sports-shoes", description: "Athletic and running shoes" },
          { name: "Sandals & Flip Flops", slug: "sandals-flip-flops", description: "Summer footwear" },
          { name: "Kids' Shoes", slug: "kids-shoes", description: "Children's footwear" },
        ]
      },
      {
        name: "Accessories",
        slug: "fashion-accessories",
        description: "Complete your look with stylish accessories",
        children: [
          { name: "Bags & Purses", slug: "bags-purses", description: "Handbags, totes, and clutches" },
          { name: "Wallets", slug: "wallets", description: "Men's and women's wallets" },
          { name: "Belts", slug: "belts", description: "Leather and fabric belts" },
          { name: "Hats & Caps", slug: "hats-caps", description: "Headwear for all seasons" },
          { name: "Scarves & Wraps", slug: "scarves-wraps", description: "Fashion scarves and shawls" },
          { name: "Sunglasses", slug: "sunglasses", description: "Designer and casual eyewear" },
        ]
      },
      {
        name: "Jewelry",
        slug: "jewelry",
        description: "Fine and fashion jewelry",
        children: [
          { name: "Necklaces", slug: "necklaces", description: "Chains, pendants, and chokers" },
          { name: "Earrings", slug: "earrings", description: "Studs, hoops, and dangles" },
          { name: "Bracelets", slug: "bracelets", description: "Bangles, cuffs, and charm bracelets" },
          { name: "Rings", slug: "rings", description: "Fashion and statement rings" },
          { name: "Watches", slug: "watches", description: "Designer and smart watches" },
        ]
      },
    ]
  },

  // ==================== ELECTRONICS & TECHNOLOGY ====================
  {
    name: "Electronics & Technology",
    slug: "electronics-technology",
    description: "Latest gadgets, computers, and electronic devices",
    iconUrl: "/icons/categories/electronics.svg",
    isFeatured: true,
    metaTitle: "Electronics & Technology | Shop Gadgets & Devices",
    metaDescription: "Find the latest electronics, smartphones, laptops, and tech accessories at competitive prices.",
    children: [
      {
        name: "Smartphones & Tablets",
        slug: "smartphones-tablets",
        description: "Mobile devices and accessories",
        isFeatured: true,
        children: [
          { name: "Smartphones", slug: "smartphones", description: "Latest mobile phones" },
          { name: "Tablets", slug: "tablets", description: "iPads and Android tablets" },
          { name: "Phone Cases", slug: "phone-cases", description: "Protective cases and covers" },
          { name: "Screen Protectors", slug: "screen-protectors", description: "Tempered glass and film" },
          { name: "Chargers & Cables", slug: "chargers-cables", description: "Charging accessories" },
        ]
      },
      {
        name: "Computers & Laptops",
        slug: "computers-laptops",
        description: "Desktop and portable computing",
        isFeatured: true,
        children: [
          { name: "Laptops", slug: "laptops", description: "Notebooks and ultrabooks" },
          { name: "Desktop Computers", slug: "desktop-computers", description: "PCs and all-in-ones" },
          { name: "Monitors", slug: "monitors", description: "Computer displays" },
          { name: "Computer Components", slug: "computer-components", description: "CPUs, GPUs, RAM, and more" },
          { name: "Keyboards & Mice", slug: "keyboards-mice", description: "Input devices" },
          { name: "Printers & Scanners", slug: "printers-scanners", description: "Office equipment" },
        ]
      },
      {
        name: "Audio & Headphones",
        slug: "audio-headphones",
        description: "Sound equipment and accessories",
        children: [
          { name: "Headphones", slug: "headphones", description: "Over-ear and on-ear headphones" },
          { name: "Earbuds", slug: "earbuds", description: "Wireless and wired earbuds" },
          { name: "Speakers", slug: "speakers", description: "Bluetooth and smart speakers" },
          { name: "Home Audio", slug: "home-audio", description: "Sound systems and receivers" },
          { name: "Microphones", slug: "microphones", description: "Recording and streaming mics" },
        ]
      },
      {
        name: "Cameras & Photography",
        slug: "cameras-photography",
        description: "Capture your moments",
        children: [
          { name: "DSLR Cameras", slug: "dslr-cameras", description: "Professional cameras" },
          { name: "Mirrorless Cameras", slug: "mirrorless-cameras", description: "Compact system cameras" },
          { name: "Action Cameras", slug: "action-cameras", description: "GoPro and sports cameras" },
          { name: "Camera Lenses", slug: "camera-lenses", description: "Interchangeable lenses" },
          { name: "Drones", slug: "drones", description: "Aerial photography drones" },
          { name: "Camera Accessories", slug: "camera-accessories", description: "Tripods, bags, and more" },
        ]
      },
      {
        name: "Gaming",
        slug: "gaming",
        description: "Video games and gaming gear",
        isFeatured: true,
        children: [
          { name: "Gaming Consoles", slug: "gaming-consoles", description: "PlayStation, Xbox, Nintendo" },
          { name: "Video Games", slug: "video-games", description: "Games for all platforms" },
          { name: "Gaming PCs", slug: "gaming-pcs", description: "High-performance gaming computers" },
          { name: "Gaming Accessories", slug: "gaming-accessories", description: "Controllers, headsets, and more" },
          { name: "VR Gaming", slug: "vr-gaming", description: "Virtual reality equipment" },
        ]
      },
      {
        name: "Smart Home",
        slug: "smart-home",
        description: "Connected home devices",
        children: [
          { name: "Smart Speakers", slug: "smart-speakers", description: "Voice assistants" },
          { name: "Smart Lighting", slug: "smart-lighting", description: "Connected bulbs and switches" },
          { name: "Smart Security", slug: "smart-security", description: "Cameras and doorbells" },
          { name: "Smart Thermostats", slug: "smart-thermostats", description: "Climate control" },
          { name: "Smart Plugs", slug: "smart-plugs", description: "Connected outlets" },
        ]
      },
      {
        name: "Wearable Technology",
        slug: "wearable-technology",
        description: "Smartwatches and fitness trackers",
        children: [
          { name: "Smartwatches", slug: "smartwatches", description: "Apple Watch, Galaxy Watch, and more" },
          { name: "Fitness Trackers", slug: "fitness-trackers", description: "Activity monitors" },
          { name: "Smart Glasses", slug: "smart-glasses", description: "AR and smart eyewear" },
        ]
      },
    ]
  },

  // ==================== HOME & LIVING ====================
  {
    name: "Home & Living",
    slug: "home-living",
    description: "Everything for your home, from furniture to decor",
    iconUrl: "/icons/categories/home.svg",
    isFeatured: true,
    metaTitle: "Home & Living | Furniture, Decor & Essentials",
    metaDescription: "Transform your space with our selection of furniture, home decor, bedding, and household essentials.",
    children: [
      {
        name: "Furniture",
        slug: "furniture",
        description: "Quality furniture for every room",
        isFeatured: true,
        children: [
          { name: "Living Room Furniture", slug: "living-room-furniture", description: "Sofas, chairs, and tables" },
          { name: "Bedroom Furniture", slug: "bedroom-furniture", description: "Beds, dressers, and nightstands" },
          { name: "Dining Room Furniture", slug: "dining-room-furniture", description: "Tables, chairs, and buffets" },
          { name: "Office Furniture", slug: "office-furniture", description: "Desks, chairs, and storage" },
          { name: "Outdoor Furniture", slug: "outdoor-furniture", description: "Patio and garden furniture" },
        ]
      },
      {
        name: "Home Decor",
        slug: "home-decor",
        description: "Decorative items and accents",
        children: [
          { name: "Wall Art", slug: "wall-art", description: "Paintings, prints, and wall decor" },
          { name: "Mirrors", slug: "mirrors", description: "Decorative and functional mirrors" },
          { name: "Vases & Plants", slug: "vases-plants", description: "Artificial and real plants" },
          { name: "Candles & Fragrances", slug: "candles-fragrances", description: "Home scenting" },
          { name: "Clocks", slug: "clocks", description: "Wall and table clocks" },
          { name: "Photo Frames", slug: "photo-frames", description: "Display your memories" },
        ]
      },
      {
        name: "Bedding & Bath",
        slug: "bedding-bath",
        description: "Comfort essentials for bedroom and bathroom",
        children: [
          { name: "Bed Sheets", slug: "bed-sheets", description: "Sheet sets and pillowcases" },
          { name: "Comforters & Duvets", slug: "comforters-duvets", description: "Bedding and blankets" },
          { name: "Pillows", slug: "pillows", description: "Bed and decorative pillows" },
          { name: "Towels", slug: "towels", description: "Bath and hand towels" },
          { name: "Bathroom Accessories", slug: "bathroom-accessories", description: "Shower curtains and organizers" },
        ]
      },
      {
        name: "Kitchen & Dining",
        slug: "kitchen-dining",
        description: "Cookware and dining essentials",
        children: [
          { name: "Cookware", slug: "cookware", description: "Pots, pans, and bakeware" },
          { name: "Dinnerware", slug: "dinnerware", description: "Plates, bowls, and serving sets" },
          { name: "Drinkware", slug: "drinkware", description: "Glasses, mugs, and bottles" },
          { name: "Cutlery", slug: "cutlery", description: "Knives, forks, and utensils" },
          { name: "Kitchen Storage", slug: "kitchen-storage", description: "Containers and organizers" },
          { name: "Small Kitchen Appliances", slug: "small-kitchen-appliances", description: "Blenders, toasters, and more" },
        ]
      },
      {
        name: "Lighting",
        slug: "lighting",
        description: "Illuminate your space",
        children: [
          { name: "Ceiling Lights", slug: "ceiling-lights", description: "Chandeliers and flush mounts" },
          { name: "Table Lamps", slug: "table-lamps", description: "Desk and accent lamps" },
          { name: "Floor Lamps", slug: "floor-lamps", description: "Standing lamps" },
          { name: "Wall Lights", slug: "wall-lights", description: "Sconces and picture lights" },
          { name: "Outdoor Lighting", slug: "outdoor-lighting", description: "Garden and patio lights" },
        ]
      },
      {
        name: "Storage & Organization",
        slug: "storage-organization",
        description: "Keep your home tidy",
        children: [
          { name: "Closet Organization", slug: "closet-organization", description: "Hangers, shelves, and bins" },
          { name: "Laundry & Cleaning", slug: "laundry-cleaning", description: "Baskets and cleaning supplies" },
          { name: "Garage Storage", slug: "garage-storage", description: "Shelving and tool storage" },
        ]
      },
    ]
  },

  // ==================== HEALTH & BEAUTY ====================
  {
    name: "Health & Beauty",
    slug: "health-beauty",
    description: "Personal care, beauty, and wellness products",
    iconUrl: "/icons/categories/beauty.svg",
    isFeatured: true,
    metaTitle: "Health & Beauty | Skincare, Makeup & Wellness",
    metaDescription: "Shop premium beauty, skincare, and health products from top brands.",
    children: [
      {
        name: "Skincare",
        slug: "skincare",
        description: "Face and body skincare products",
        isFeatured: true,
        children: [
          { name: "Cleansers", slug: "cleansers", description: "Face washes and cleansing oils" },
          { name: "Moisturizers", slug: "moisturizers", description: "Day and night creams" },
          { name: "Serums & Treatments", slug: "serums-treatments", description: "Targeted skincare" },
          { name: "Sunscreen", slug: "sunscreen", description: "SPF protection" },
          { name: "Masks & Exfoliators", slug: "masks-exfoliators", description: "Deep treatment products" },
          { name: "Eye Care", slug: "eye-care", description: "Eye creams and treatments" },
        ]
      },
      {
        name: "Makeup",
        slug: "makeup",
        description: "Cosmetics and beauty products",
        isFeatured: true,
        children: [
          { name: "Face Makeup", slug: "face-makeup", description: "Foundation, concealer, and powder" },
          { name: "Eye Makeup", slug: "eye-makeup", description: "Eyeshadow, mascara, and liner" },
          { name: "Lip Makeup", slug: "lip-makeup", description: "Lipstick, gloss, and liner" },
          { name: "Makeup Tools", slug: "makeup-tools", description: "Brushes and applicators" },
          { name: "Makeup Sets", slug: "makeup-sets", description: "Gift sets and palettes" },
        ]
      },
      {
        name: "Hair Care",
        slug: "hair-care",
        description: "Shampoo, styling, and hair treatments",
        children: [
          { name: "Shampoo & Conditioner", slug: "shampoo-conditioner", description: "Hair cleansing products" },
          { name: "Hair Styling", slug: "hair-styling", description: "Gels, sprays, and serums" },
          { name: "Hair Tools", slug: "hair-tools", description: "Dryers, straighteners, and curlers" },
          { name: "Hair Treatments", slug: "hair-treatments", description: "Masks and oils" },
          { name: "Hair Color", slug: "hair-color", description: "Dyes and highlights" },
        ]
      },
      {
        name: "Fragrances",
        slug: "fragrances",
        description: "Perfumes and colognes",
        children: [
          { name: "Women's Fragrances", slug: "womens-fragrances", description: "Perfumes and body mists" },
          { name: "Men's Fragrances", slug: "mens-fragrances", description: "Colognes and aftershaves" },
          { name: "Unisex Fragrances", slug: "unisex-fragrances", description: "Gender-neutral scents" },
        ]
      },
      {
        name: "Personal Care",
        slug: "personal-care",
        description: "Daily hygiene and grooming",
        children: [
          { name: "Bath & Body", slug: "bath-body", description: "Soaps, lotions, and body wash" },
          { name: "Oral Care", slug: "oral-care", description: "Toothpaste and mouthwash" },
          { name: "Deodorants", slug: "deodorants", description: "Antiperspirants and body sprays" },
          { name: "Men's Grooming", slug: "mens-grooming", description: "Shaving and beard care" },
        ]
      },
      {
        name: "Health & Wellness",
        slug: "health-wellness",
        description: "Health supplements and wellness products",
        children: [
          { name: "Vitamins & Supplements", slug: "vitamins-supplements", description: "Nutritional support" },
          { name: "Fitness & Nutrition", slug: "fitness-nutrition", description: "Protein and workout supplements" },
          { name: "First Aid", slug: "first-aid", description: "Medical supplies and bandages" },
          { name: "Medical Devices", slug: "medical-devices", description: "Monitors and therapy devices" },
        ]
      },
    ]
  },

  // ==================== FOOD & BEVERAGES ====================
  {
    name: "Food & Beverages",
    slug: "food-beverages",
    description: "Groceries, gourmet foods, and drinks",
    iconUrl: "/icons/categories/food.svg",
    isFeatured: true,
    metaTitle: "Food & Beverages | Groceries & Gourmet Products",
    metaDescription: "Shop fresh groceries, gourmet foods, and beverages delivered to your door.",
    children: [
      {
        name: "Fresh Produce",
        slug: "fresh-produce",
        description: "Fruits and vegetables",
        children: [
          { name: "Fruits", slug: "fruits", description: "Fresh and organic fruits" },
          { name: "Vegetables", slug: "vegetables", description: "Fresh and organic vegetables" },
          { name: "Organic Produce", slug: "organic-produce", description: "Certified organic items" },
        ]
      },
      {
        name: "Meat & Seafood",
        slug: "meat-seafood",
        description: "Fresh and frozen proteins",
        children: [
          { name: "Beef", slug: "beef", description: "Steaks, ground beef, and roasts" },
          { name: "Poultry", slug: "poultry", description: "Chicken, turkey, and duck" },
          { name: "Pork", slug: "pork", description: "Chops, bacon, and ham" },
          { name: "Seafood", slug: "seafood", description: "Fish, shrimp, and shellfish" },
        ]
      },
      {
        name: "Dairy & Eggs",
        slug: "dairy-eggs",
        description: "Fresh dairy products",
        children: [
          { name: "Milk", slug: "milk", description: "Whole, skim, and plant-based" },
          { name: "Cheese", slug: "cheese", description: "Artisan and everyday cheese" },
          { name: "Yogurt", slug: "yogurt", description: "Greek, regular, and plant-based" },
          { name: "Eggs", slug: "eggs", description: "Free-range and organic eggs" },
          { name: "Butter & Cream", slug: "butter-cream", description: "Dairy essentials" },
        ]
      },
      {
        name: "Pantry Staples",
        slug: "pantry-staples",
        description: "Essential cooking ingredients",
        children: [
          { name: "Rice & Grains", slug: "rice-grains", description: "Rice, quinoa, and more" },
          { name: "Pasta & Noodles", slug: "pasta-noodles", description: "Italian and Asian varieties" },
          { name: "Oils & Vinegars", slug: "oils-vinegars", description: "Cooking oils and dressings" },
          { name: "Canned Goods", slug: "canned-goods", description: "Preserved foods" },
          { name: "Spices & Seasonings", slug: "spices-seasonings", description: "Herbs and spice blends" },
          { name: "Sauces & Condiments", slug: "sauces-condiments", description: "Cooking sauces" },
        ]
      },
      {
        name: "Beverages",
        slug: "beverages",
        description: "Drinks for every occasion",
        children: [
          { name: "Coffee", slug: "coffee", description: "Beans, ground, and pods" },
          { name: "Tea", slug: "tea", description: "Loose leaf and tea bags" },
          { name: "Soft Drinks", slug: "soft-drinks", description: "Sodas and sparkling water" },
          { name: "Juices", slug: "juices", description: "Fresh and packaged juices" },
          { name: "Water", slug: "water", description: "Still and sparkling" },
          { name: "Energy Drinks", slug: "energy-drinks", description: "Sports and energy beverages" },
        ]
      },
      {
        name: "Snacks & Sweets",
        slug: "snacks-sweets",
        description: "Treats and snack foods",
        children: [
          { name: "Chips & Crackers", slug: "chips-crackers", description: "Savory snacks" },
          { name: "Chocolate & Candy", slug: "chocolate-candy", description: "Sweet treats" },
          { name: "Cookies & Biscuits", slug: "cookies-biscuits", description: "Baked treats" },
          { name: "Nuts & Dried Fruits", slug: "nuts-dried-fruits", description: "Healthy snacking" },
        ]
      },
      {
        name: "Bakery",
        slug: "bakery",
        description: "Fresh baked goods",
        children: [
          { name: "Bread", slug: "bread", description: "Fresh and packaged bread" },
          { name: "Pastries", slug: "pastries", description: "Croissants and danish" },
          { name: "Cakes & Desserts", slug: "cakes-desserts", description: "Sweet baked goods" },
        ]
      },
    ]
  },

  // ==================== KIDS, BABY & TOYS ====================
  {
    name: "Kids, Baby & Toys",
    slug: "kids-baby-toys",
    description: "Everything for children from babies to teens",
    iconUrl: "/icons/categories/kids.svg",
    isFeatured: true,
    metaTitle: "Kids, Baby & Toys | Children's Products & Games",
    metaDescription: "Shop baby essentials, kids' clothing, toys, and educational products.",
    children: [
      {
        name: "Baby Products",
        slug: "baby-products",
        description: "Essentials for infants and toddlers",
        isFeatured: true,
        children: [
          { name: "Diapers & Wipes", slug: "diapers-wipes", description: "Baby hygiene essentials" },
          { name: "Baby Food", slug: "baby-food", description: "Formula and baby meals" },
          { name: "Baby Gear", slug: "baby-gear", description: "Strollers, car seats, and carriers" },
          { name: "Baby Clothing", slug: "baby-clothing", description: "Infant apparel" },
          { name: "Nursery", slug: "nursery", description: "Cribs, bedding, and decor" },
          { name: "Baby Care", slug: "baby-care", description: "Bath, skincare, and health" },
        ]
      },
      {
        name: "Kids' Clothing",
        slug: "kids-clothing",
        description: "Apparel for children",
        children: [
          { name: "Girls' Clothing", slug: "girls-clothing", description: "Dresses, tops, and bottoms" },
          { name: "Boys' Clothing", slug: "boys-clothing", description: "Shirts, pants, and shorts" },
          { name: "School Uniforms", slug: "school-uniforms", description: "School attire" },
          { name: "Kids' Outerwear", slug: "kids-outerwear", description: "Jackets and coats" },
        ]
      },
      {
        name: "Toys & Games",
        slug: "toys-games",
        description: "Fun and educational play items",
        isFeatured: true,
        children: [
          { name: "Action Figures", slug: "action-figures", description: "Collectible figures and playsets" },
          { name: "Dolls & Accessories", slug: "dolls-accessories", description: "Dolls and dollhouses" },
          { name: "Building Toys", slug: "building-toys", description: "LEGO, blocks, and construction" },
          { name: "Board Games", slug: "board-games", description: "Family and strategy games" },
          { name: "Puzzles", slug: "puzzles", description: "Jigsaw and brain teasers" },
          { name: "Outdoor Toys", slug: "outdoor-toys", description: "Bikes, scooters, and play equipment" },
          { name: "Remote Control Toys", slug: "remote-control-toys", description: "RC cars, drones, and robots" },
        ]
      },
      {
        name: "Educational",
        slug: "educational",
        description: "Learning products for children",
        children: [
          { name: "STEM Toys", slug: "stem-toys", description: "Science and coding kits" },
          { name: "Books for Kids", slug: "books-for-kids", description: "Children's literature" },
          { name: "Art & Craft", slug: "art-craft", description: "Creative supplies" },
          { name: "Musical Instruments", slug: "kids-musical-instruments", description: "Beginner instruments" },
        ]
      },
    ]
  },

  // ==================== SPORTS & OUTDOORS ====================
  {
    name: "Sports & Outdoors",
    slug: "sports-outdoors",
    description: "Athletic equipment and outdoor gear",
    iconUrl: "/icons/categories/sports.svg",
    isFeatured: true,
    metaTitle: "Sports & Outdoors | Equipment & Gear",
    metaDescription: "Shop sports equipment, fitness gear, and outdoor adventure essentials.",
    children: [
      {
        name: "Exercise & Fitness",
        slug: "exercise-fitness",
        description: "Gym and home workout equipment",
        isFeatured: true,
        children: [
          { name: "Cardio Equipment", slug: "cardio-equipment", description: "Treadmills, bikes, and ellipticals" },
          { name: "Strength Training", slug: "strength-training", description: "Weights and resistance" },
          { name: "Yoga & Pilates", slug: "yoga-pilates", description: "Mats, blocks, and props" },
          { name: "Fitness Accessories", slug: "fitness-accessories", description: "Bands, balls, and rollers" },
        ]
      },
      {
        name: "Team Sports",
        slug: "team-sports",
        description: "Equipment for team activities",
        children: [
          { name: "Soccer", slug: "soccer", description: "Balls, cleats, and gear" },
          { name: "Basketball", slug: "basketball", description: "Balls, hoops, and apparel" },
          { name: "Baseball & Softball", slug: "baseball-softball", description: "Bats, gloves, and equipment" },
          { name: "Football", slug: "football", description: "Balls and protective gear" },
          { name: "Volleyball", slug: "volleyball", description: "Balls and nets" },
        ]
      },
      {
        name: "Outdoor Recreation",
        slug: "outdoor-recreation",
        description: "Gear for outdoor adventures",
        children: [
          { name: "Camping & Hiking", slug: "camping-hiking", description: "Tents, backpacks, and gear" },
          { name: "Cycling", slug: "cycling", description: "Bikes and accessories" },
          { name: "Fishing", slug: "fishing", description: "Rods, reels, and tackle" },
          { name: "Hunting", slug: "hunting", description: "Hunting gear and accessories" },
          { name: "Water Sports", slug: "water-sports", description: "Kayaks, paddleboards, and gear" },
        ]
      },
      {
        name: "Racquet Sports",
        slug: "racquet-sports",
        description: "Tennis, badminton, and more",
        children: [
          { name: "Tennis", slug: "tennis", description: "Rackets, balls, and accessories" },
          { name: "Badminton", slug: "badminton", description: "Rackets and shuttlecocks" },
          { name: "Table Tennis", slug: "table-tennis", description: "Paddles and tables" },
        ]
      },
      {
        name: "Golf",
        slug: "golf",
        description: "Golf equipment and accessories",
        children: [
          { name: "Golf Clubs", slug: "golf-clubs", description: "Drivers, irons, and putters" },
          { name: "Golf Balls", slug: "golf-balls", description: "Performance golf balls" },
          { name: "Golf Bags", slug: "golf-bags", description: "Carry and cart bags" },
          { name: "Golf Accessories", slug: "golf-accessories", description: "Gloves, tees, and more" },
        ]
      },
    ]
  },

  // ==================== AUTOMOTIVE ====================
  {
    name: "Automotive",
    slug: "automotive",
    description: "Auto parts, accessories, and vehicle care",
    iconUrl: "/icons/categories/automotive.svg",
    metaTitle: "Automotive | Car Parts & Accessories",
    metaDescription: "Find auto parts, car accessories, and vehicle maintenance products.",
    children: [
      {
        name: "Auto Parts",
        slug: "auto-parts",
        description: "Replacement parts for vehicles",
        children: [
          { name: "Engine Parts", slug: "engine-parts", description: "Engine components and filters" },
          { name: "Brakes", slug: "brakes", description: "Brake pads, rotors, and systems" },
          { name: "Suspension", slug: "suspension", description: "Shocks, struts, and springs" },
          { name: "Batteries", slug: "auto-batteries", description: "Car batteries" },
          { name: "Lighting", slug: "auto-lighting", description: "Headlights and bulbs" },
        ]
      },
      {
        name: "Car Accessories",
        slug: "car-accessories",
        description: "Interior and exterior accessories",
        children: [
          { name: "Interior Accessories", slug: "interior-accessories", description: "Floor mats, seat covers, and organizers" },
          { name: "Exterior Accessories", slug: "exterior-accessories", description: "Covers, roof racks, and trim" },
          { name: "Car Electronics", slug: "car-electronics", description: "GPS, dash cams, and audio" },
        ]
      },
      {
        name: "Tires & Wheels",
        slug: "tires-wheels",
        description: "Tires, wheels, and accessories",
        children: [
          { name: "Tires", slug: "tires", description: "All-season and performance tires" },
          { name: "Wheels & Rims", slug: "wheels-rims", description: "Alloy and steel wheels" },
          { name: "Tire Accessories", slug: "tire-accessories", description: "Pumps, gauges, and repair kits" },
        ]
      },
      {
        name: "Car Care",
        slug: "car-care",
        description: "Cleaning and maintenance products",
        children: [
          { name: "Cleaning Supplies", slug: "car-cleaning-supplies", description: "Wash, wax, and detail" },
          { name: "Oils & Fluids", slug: "oils-fluids", description: "Motor oil and automotive fluids" },
          { name: "Tools & Equipment", slug: "auto-tools-equipment", description: "Automotive tools" },
        ]
      },
      {
        name: "Motorcycle",
        slug: "motorcycle",
        description: "Motorcycle parts and gear",
        children: [
          { name: "Motorcycle Parts", slug: "motorcycle-parts", description: "Replacement parts" },
          { name: "Motorcycle Gear", slug: "motorcycle-gear", description: "Helmets, jackets, and gloves" },
          { name: "Motorcycle Accessories", slug: "motorcycle-accessories", description: "Luggage and add-ons" },
        ]
      },
    ]
  },

  // ==================== ENTERTAINMENT & MEDIA ====================
  {
    name: "Entertainment & Media",
    slug: "entertainment-media",
    description: "Books, music, movies, and more",
    iconUrl: "/icons/categories/entertainment.svg",
    metaTitle: "Entertainment & Media | Books, Music & Movies",
    metaDescription: "Shop books, music, movies, and entertainment products.",
    children: [
      {
        name: "Books",
        slug: "books",
        description: "Physical and digital books",
        isFeatured: true,
        children: [
          { name: "Fiction", slug: "fiction-books", description: "Novels and stories" },
          { name: "Non-Fiction", slug: "non-fiction-books", description: "Biographies, history, and more" },
          { name: "Textbooks", slug: "textbooks", description: "Educational materials" },
          { name: "Children's Books", slug: "childrens-books", description: "Kids' literature" },
          { name: "E-Books", slug: "e-books", description: "Digital books" },
          { name: "Audiobooks", slug: "audiobooks", description: "Audio literature" },
        ]
      },
      {
        name: "Music",
        slug: "music",
        description: "CDs, vinyl, and digital music",
        children: [
          { name: "CDs", slug: "cds", description: "Music on CD" },
          { name: "Vinyl Records", slug: "vinyl-records", description: "LP and 45s" },
          { name: "Digital Music", slug: "digital-music", description: "Downloads and streaming" },
        ]
      },
      {
        name: "Movies & TV",
        slug: "movies-tv",
        description: "DVDs, Blu-rays, and streaming",
        children: [
          { name: "DVDs", slug: "dvds", description: "Standard definition media" },
          { name: "Blu-ray", slug: "blu-ray", description: "High definition movies" },
          { name: "4K Ultra HD", slug: "4k-ultra-hd", description: "Premium resolution" },
          { name: "TV Series", slug: "tv-series", description: "Complete series sets" },
        ]
      },
      {
        name: "Musical Instruments",
        slug: "musical-instruments",
        description: "Instruments and accessories",
        children: [
          { name: "Guitars", slug: "guitars", description: "Acoustic and electric guitars" },
          { name: "Keyboards & Pianos", slug: "keyboards-pianos", description: "Keys and synths" },
          { name: "Drums & Percussion", slug: "drums-percussion", description: "Drum kits and more" },
          { name: "Wind Instruments", slug: "wind-instruments", description: "Brass and woodwinds" },
          { name: "String Instruments", slug: "string-instruments", description: "Violins, cellos, and more" },
          { name: "DJ & Production", slug: "dj-production", description: "Mixers and controllers" },
        ]
      },
    ]
  },

  // ==================== BUSINESS & INDUSTRIAL ====================
  {
    name: "Business & Industrial",
    slug: "business-industrial",
    description: "Professional equipment and supplies",
    iconUrl: "/icons/categories/business.svg",
    metaTitle: "Business & Industrial | Professional Equipment",
    metaDescription: "Shop professional-grade equipment, office supplies, and industrial products.",
    children: [
      {
        name: "Office Supplies",
        slug: "office-supplies",
        description: "Workplace essentials",
        children: [
          { name: "Paper & Notebooks", slug: "paper-notebooks", description: "Writing supplies" },
          { name: "Pens & Writing", slug: "pens-writing", description: "Writing instruments" },
          { name: "Office Organization", slug: "office-organization", description: "Filing and storage" },
          { name: "Office Technology", slug: "office-technology", description: "Calculators and devices" },
        ]
      },
      {
        name: "Industrial Equipment",
        slug: "industrial-equipment",
        description: "Heavy-duty machinery and tools",
        children: [
          { name: "Power Tools", slug: "power-tools", description: "Drills, saws, and sanders" },
          { name: "Hand Tools", slug: "hand-tools", description: "Wrenches, hammers, and pliers" },
          { name: "Safety Equipment", slug: "safety-equipment", description: "PPE and safety gear" },
          { name: "Material Handling", slug: "material-handling", description: "Carts, lifts, and storage" },
        ]
      },
      {
        name: "Restaurant & Food Service",
        slug: "restaurant-food-service",
        description: "Commercial kitchen equipment",
        children: [
          { name: "Commercial Cooking", slug: "commercial-cooking", description: "Ovens, grills, and fryers" },
          { name: "Refrigeration", slug: "commercial-refrigeration", description: "Commercial coolers and freezers" },
          { name: "Food Prep", slug: "food-prep", description: "Prep tables and equipment" },
          { name: "Serving & Display", slug: "serving-display", description: "Display cases and serving" },
        ]
      },
      {
        name: "Medical & Lab",
        slug: "medical-lab",
        description: "Healthcare and laboratory supplies",
        children: [
          { name: "Lab Equipment", slug: "lab-equipment", description: "Scientific instruments" },
          { name: "Medical Supplies", slug: "medical-supplies-pro", description: "Professional medical supplies" },
          { name: "Diagnostic Equipment", slug: "diagnostic-equipment", description: "Testing and diagnostics" },
        ]
      },
    ]
  },

  // ==================== SPECIALTY CATEGORIES ====================
  {
    name: "Pet Supplies",
    slug: "pet-supplies",
    description: "Everything for your furry friends",
    iconUrl: "/icons/categories/pets.svg",
    isFeatured: true,
    metaTitle: "Pet Supplies | Food, Toys & Accessories",
    metaDescription: "Shop pet food, toys, and supplies for dogs, cats, and more.",
    children: [
      {
        name: "Dog Supplies",
        slug: "dog-supplies",
        description: "Products for dogs",
        children: [
          { name: "Dog Food", slug: "dog-food", description: "Dry, wet, and treats" },
          { name: "Dog Toys", slug: "dog-toys", description: "Chew toys and interactive play" },
          { name: "Dog Beds & Crates", slug: "dog-beds-crates", description: "Sleeping and housing" },
          { name: "Dog Health", slug: "dog-health", description: "Vitamins and medications" },
        ]
      },
      {
        name: "Cat Supplies",
        slug: "cat-supplies",
        description: "Products for cats",
        children: [
          { name: "Cat Food", slug: "cat-food", description: "Dry, wet, and treats" },
          { name: "Cat Toys", slug: "cat-toys", description: "Interactive toys and scratchers" },
          { name: "Litter & Accessories", slug: "litter-accessories", description: "Litter boxes and supplies" },
          { name: "Cat Health", slug: "cat-health", description: "Vitamins and medications" },
        ]
      },
      {
        name: "Fish & Aquatics",
        slug: "fish-aquatics",
        description: "Aquarium supplies",
        children: [
          { name: "Aquariums", slug: "aquariums", description: "Tanks and stands" },
          { name: "Fish Food", slug: "fish-food", description: "Flakes, pellets, and treats" },
          { name: "Aquarium Equipment", slug: "aquarium-equipment", description: "Filters, heaters, and pumps" },
        ]
      },
      {
        name: "Small Pets",
        slug: "small-pets",
        description: "Supplies for small animals",
        children: [
          { name: "Small Animal Food", slug: "small-animal-food", description: "Food for hamsters, rabbits, etc." },
          { name: "Cages & Habitats", slug: "cages-habitats", description: "Housing for small pets" },
        ]
      },
    ]
  },

  {
    name: "Garden & Outdoor",
    slug: "garden-outdoor",
    description: "Gardening tools and outdoor living",
    iconUrl: "/icons/categories/garden.svg",
    metaTitle: "Garden & Outdoor | Plants, Tools & Decor",
    metaDescription: "Shop gardening supplies, outdoor furniture, and lawn care products.",
    children: [
      {
        name: "Plants & Seeds",
        slug: "plants-seeds",
        description: "Live plants and planting",
        children: [
          { name: "Indoor Plants", slug: "indoor-plants", description: "Houseplants and succulents" },
          { name: "Outdoor Plants", slug: "outdoor-plants", description: "Flowers, shrubs, and trees" },
          { name: "Seeds & Bulbs", slug: "seeds-bulbs", description: "Plant your own garden" },
        ]
      },
      {
        name: "Garden Tools",
        slug: "garden-tools",
        description: "Hand and power tools for gardening",
        children: [
          { name: "Hand Tools", slug: "garden-hand-tools", description: "Trowels, pruners, and more" },
          { name: "Power Equipment", slug: "garden-power-equipment", description: "Mowers, trimmers, and blowers" },
          { name: "Watering", slug: "watering", description: "Hoses, sprinklers, and irrigation" },
        ]
      },
      {
        name: "Outdoor Decor",
        slug: "outdoor-decor",
        description: "Patio and garden decoration",
        children: [
          { name: "Planters & Pots", slug: "planters-pots", description: "Containers for plants" },
          { name: "Garden Decor", slug: "garden-decor", description: "Statues, fountains, and ornaments" },
          { name: "Outdoor Lighting", slug: "garden-outdoor-lighting", description: "Solar and wired lights" },
        ]
      },
      {
        name: "Grills & Outdoor Cooking",
        slug: "grills-outdoor-cooking",
        description: "BBQ and outdoor kitchens",
        children: [
          { name: "Gas Grills", slug: "gas-grills", description: "Propane and natural gas" },
          { name: "Charcoal Grills", slug: "charcoal-grills", description: "Traditional charcoal BBQ" },
          { name: "Smokers", slug: "smokers", description: "Smoking equipment" },
          { name: "Grill Accessories", slug: "grill-accessories", description: "Tools and covers" },
        ]
      },
    ]
  },

  {
    name: "Arts & Crafts",
    slug: "arts-crafts",
    description: "Creative supplies and DIY materials",
    iconUrl: "/icons/categories/crafts.svg",
    metaTitle: "Arts & Crafts | Creative Supplies & Materials",
    metaDescription: "Shop art supplies, craft materials, and DIY project essentials.",
    children: [
      {
        name: "Art Supplies",
        slug: "art-supplies",
        description: "Professional and student art materials",
        children: [
          { name: "Paints", slug: "paints", description: "Acrylics, oils, and watercolors" },
          { name: "Drawing", slug: "drawing-supplies", description: "Pencils, charcoal, and pastels" },
          { name: "Canvas & Paper", slug: "canvas-paper", description: "Surfaces for art" },
          { name: "Brushes & Tools", slug: "brushes-tools", description: "Art tools and accessories" },
        ]
      },
      {
        name: "Crafting",
        slug: "crafting",
        description: "DIY and craft supplies",
        children: [
          { name: "Sewing & Fabric", slug: "sewing-fabric", description: "Fabric, thread, and notions" },
          { name: "Scrapbooking", slug: "scrapbooking", description: "Albums, paper, and embellishments" },
          { name: "Jewelry Making", slug: "jewelry-making", description: "Beads, wire, and findings" },
          { name: "Knitting & Crochet", slug: "knitting-crochet", description: "Yarn and needles" },
        ]
      },
    ]
  },

  {
    name: "Office & School Supplies",
    slug: "office-school-supplies",
    description: "Supplies for work and education",
    iconUrl: "/icons/categories/office.svg",
    metaTitle: "Office & School Supplies | Stationery & Essentials",
    metaDescription: "Shop office supplies, school essentials, and stationery products.",
    children: [
      {
        name: "Writing Supplies",
        slug: "writing-supplies",
        description: "Pens, pencils, and markers",
        children: [
          { name: "Pens", slug: "pens", description: "Ballpoint, gel, and fountain" },
          { name: "Pencils", slug: "pencils", description: "Graphite and mechanical" },
          { name: "Markers & Highlighters", slug: "markers-highlighters", description: "Coloring and highlighting" },
        ]
      },
      {
        name: "Paper Products",
        slug: "paper-products",
        description: "Notebooks and paper",
        children: [
          { name: "Notebooks", slug: "notebooks", description: "Spiral, composition, and journals" },
          { name: "Printer Paper", slug: "printer-paper", description: "Copy and specialty paper" },
          { name: "Sticky Notes", slug: "sticky-notes", description: "Post-its and flags" },
        ]
      },
      {
        name: "Desk Accessories",
        slug: "desk-accessories",
        description: "Organization and desk tools",
        children: [
          { name: "Organizers", slug: "desk-organizers", description: "Trays, holders, and caddies" },
          { name: "Staplers & Hole Punches", slug: "staplers-hole-punches", description: "Desktop tools" },
          { name: "Calendars & Planners", slug: "calendars-planners", description: "Planning tools" },
        ]
      },
      {
        name: "School Supplies",
        slug: "school-supplies",
        description: "Back to school essentials",
        children: [
          { name: "Backpacks", slug: "backpacks", description: "School bags and book bags" },
          { name: "Lunch Boxes", slug: "lunch-boxes", description: "Lunch bags and containers" },
          { name: "Art Supplies for School", slug: "school-art-supplies", description: "Classroom art materials" },
        ]
      },
    ]
  },
];

async function createCategoryWithClosure(
  prisma: PrismaClient,
  category: CategorySeed,
  parentId: string | null,
  level: number,
  sortOrder: number,
  ancestors: string[] = []
): Promise<void> {
  // Create the category
  const created = await prisma.category.create({
    data: {
      name: category.name,
      slug: category.slug,
      description: category.description || null,
      parentId: parentId,
      level: level,
      sortOrder: sortOrder,
      iconUrl: category.iconUrl || null,
      isFeatured: category.isFeatured || false,
      status: CategoryStatus.ACTIVE,
      metaTitle: category.metaTitle || category.name,
      metaDescription: category.metaDescription || category.description || null,
    },
  });

  console.log(`Created category: ${category.name} (level ${level})`);

  // Create closure table entries
  // Self-reference (depth 0)
  await prisma.categoryClosure.create({
    data: {
      ancestorId: created.id,
      descendantId: created.id,
      depth: 0,
    },
  });

  // Ancestor references
  for (let i = 0; i < ancestors.length; i++) {
    const depth = ancestors.length - i;
    await prisma.categoryClosure.create({
      data: {
        ancestorId: ancestors[i],
        descendantId: created.id,
        depth: depth,
      },
    });
  }

  // Process children
  if (category.children && category.children.length > 0) {
    const newAncestors = [...ancestors, created.id];
    for (let i = 0; i < category.children.length; i++) {
      await createCategoryWithClosure(
        prisma,
        category.children[i],
        created.id,
        level + 1,
        i,
        newAncestors
      );
    }
  }
}

async function seedCategories() {
  console.log('Starting category seeding...');
  console.log('='.repeat(50));

  try {
    // Clear existing categories and closures
    console.log('Clearing existing category data...');
    await prisma.categoryClosure.deleteMany({});
    await prisma.categoryView.deleteMany({});
    await prisma.categoryFilter.deleteMany({});
    await prisma.categoryAttribute.deleteMany({});
    await prisma.categoryPromotion.deleteMany({});
    await prisma.category.deleteMany({});

    console.log('Existing data cleared.');
    console.log('='.repeat(50));

    // Seed all categories
    let sortOrder = 0;
    for (const rootCategory of categoryTree) {
      await createCategoryWithClosure(prisma, rootCategory, null, 0, sortOrder, []);
      sortOrder++;
    }

    // Get counts
    const categoryCount = await prisma.category.count();
    const closureCount = await prisma.categoryClosure.count();

    console.log('='.repeat(50));
    console.log(`Seeding complete!`);
    console.log(`Total categories created: ${categoryCount}`);
    console.log(`Total closure entries: ${closureCount}`);

    // Print category tree summary
    console.log('\nCategory Summary by Level:');
    const levelCounts = await prisma.category.groupBy({
      by: ['level'],
      _count: { id: true },
      orderBy: { level: 'asc' },
    });

    for (const lc of levelCounts) {
      console.log(`  Level ${lc.level}: ${lc._count.id} categories`);
    }

    // Print featured categories
    const featured = await prisma.category.findMany({
      where: { isFeatured: true },
      select: { name: true, level: true },
    });

    console.log('\nFeatured Categories:');
    for (const f of featured) {
      console.log(`  - ${f.name} (level ${f.level})`);
    }

  } catch (error) {
    console.error('Error seeding categories:', error);
    throw error;
  }
}

// Main execution
seedCategories()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
