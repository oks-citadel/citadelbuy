# Inventory Management System - Quick Start Guide

## 🚀 Getting Started

### 1. Start the Backend
```bash
cd backend
npm run dev
```

**Expected output:**
```
[Nest] LOG [NestApplication] Nest application successfully started
Server running on http://localhost:3001
```

### 2. Start the Frontend
```bash
cd frontend
npm run dev
```

**Expected output:**
```
▲ Next.js 15.5.6
- Local: http://localhost:3000
```

### 3. Login as Admin
1. Navigate to `http://localhost:3000/auth/login`
2. Login with admin credentials:
   - Email: `admin@citadelbuy.com`
   - Password: (your admin password)

---

## 📍 Navigation

### Access Inventory Dashboard
1. Navigate to `http://localhost:3000/inventory/dashboard`
2. You should see:
   - 6 statistics cards
   - Recent alerts section
   - Quick action buttons

### All Inventory Pages
- **Dashboard:** `/inventory/dashboard`
- **Stock Levels:** `/inventory/stock`
- **Warehouses:** `/inventory/warehouses`
- **Transfers:** `/inventory/transfers`
- **Movements:** `/inventory/movements`
- **Alerts:** `/inventory/alerts`
- **Backorders:** `/inventory/backorders`
- **Forecasting:** `/inventory/forecasting`

---

## 🧪 Quick Tests

### Test 1: View Warehouses (30 seconds)
1. Go to `/inventory/warehouses`
2. You should see 5 warehouses:
   - New York Main Warehouse (PRIMARY)
   - Los Angeles Distribution Center
   - Chicago Fulfillment Center
   - Miami Southeast Hub
   - Seattle Pacific Northwest Center

### Test 2: Create a Product (if needed)
Before testing inventory, you need at least one product:

1. Go to `/admin/products`
2. Create a test product with:
   - Name: "Test Product"
   - SKU: "TEST-001"
   - Price: $10.00
   - Category: Any
   - Save

### Test 3: Stock Adjustment (1 minute)
1. Go to `/inventory/stock`
2. Find your test product
3. Click "Adjust"
4. Select "Purchase (Received Stock)"
5. Enter quantity: `100`
6. Enter reason: "Initial stock"
7. Submit
8. Verify quantity updated in table

### Test 4: Create Transfer (2 minutes)
1. Go to `/inventory/transfers`
2. Click "+ Create Transfer"
3. Fill in:
   - From Warehouse: New York Main Warehouse
   - To Warehouse: Los Angeles Distribution Center
   - Product ID: (copy from stock page)
   - Quantity: 10
   - Notes: "Test transfer"
4. Submit
5. Verify transfer appears with PENDING status
6. Click "Approve" → Status changes to IN_TRANSIT
7. Click "Receive" → Status changes to COMPLETED

### Test 5: View Movement History (30 seconds)
1. Go to `/inventory/movements`
2. You should see:
   - Your stock adjustment (PURCHASE type, green)
   - Transfer out from NY (TRANSFER_OUT type, blue)
   - Transfer in to LA (TRANSFER_IN type, green)
3. Verify all details are correct

### Test 6: Generate Alert (1 minute)
1. Go to `/inventory/alerts`
2. Click "🔍 Check for Alerts"
3. If stock is above reorder point, no alerts created
4. To test alerts:
   - Go to `/inventory/stock`
   - Find an item with quantity above reorder point
   - Adjust it down below reorder point
   - Go back to `/inventory/alerts`
   - Click "🔍 Check for Alerts"
   - Alert should appear

### Test 7: Create Backorder (2 minutes)
Backorders are typically created when orders can't be fulfilled. To manually test:

1. Use backend API or create through order system
2. Backorder will appear in `/inventory/backorders`
3. To fulfill:
   - Click "Fulfill Backorders" on product card
   - Enter quantity available
   - Submit
   - Verify status changes to FULFILLED

### Test 8: Generate Forecast (1 minute)
1. Go to `/inventory/forecasting`
2. Click "+ Generate Forecast"
3. Fill in:
   - Product ID: (your test product ID)
   - Warehouse: New York Main Warehouse
   - Period: WEEKLY
   - Period Date: (today's date)
4. Submit
5. Forecast appears in table with:
   - Predicted demand
   - Seasonal factor
   - Confidence score

---

## 🔄 Automated Jobs

The following cron jobs run automatically:

### Hourly
- **Low Stock Alerts Check:** Creates alerts for items below reorder point
  - Check logs: Look for `[InventoryJobs] Hourly low stock check`

### Daily (2 AM)
- **Reorder Points Check:** Creates reorder requests
  - Check logs: Look for `[InventoryJobs] Daily reorder check`

### Daily (1 AM)
- **Forecast Cleanup:** Removes expired forecasts (90+ days old)

### Weekly (Sunday 3 AM)
- **Weekly Forecasts:** Generates forecasts for all products
  - Check logs: Look for `[InventoryJobs] Weekly forecast generation`

### Monthly (1st of month, 4 AM)
- **Alert Cleanup:** Removes old resolved alerts (90+ days)

### Monthly (1st of month, 5 AM)
- **Statistics Report:** Generates monthly inventory report
  - Check logs: Look for `[InventoryJobs] Monthly report`

**To view job logs:**
```bash
# Backend console will show cron job execution
# Look for lines starting with [InventoryJobs]
```

---

## 🐛 Troubleshooting

### Issue: Pages show "No items found"
**Solution:**
1. Check backend is running on port 3001
2. Check database connection
3. Verify you're logged in as admin
4. Check browser console for errors

### Issue: "Failed to fetch" errors
**Solution:**
1. Verify backend is running: `http://localhost:3001`
2. Check CORS settings in backend
3. Verify API_URL in frontend `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```
4. Check browser console for detailed error

### Issue: Authorization errors
**Solution:**
1. Verify you're logged in
2. Check localStorage for token:
   - Open browser DevTools → Application → Local Storage
   - Look for `token` key
3. Verify user has ADMIN role
4. Try logging out and back in

### Issue: Database errors
**Solution:**
1. Verify PostgreSQL is running
2. Check database connection in backend `.env`:
   ```
   DATABASE_URL="postgresql://citadelbuy:password@localhost:5432/citadelbuy_dev"
   ```
3. Verify schema is applied:
   ```bash
   cd backend
   npx prisma db push
   ```

### Issue: TypeScript errors
**Solution:**
1. Rebuild frontend:
   ```bash
   cd frontend
   npm run build
   ```
2. Check for compilation errors
3. Verify all dependencies installed:
   ```bash
   npm install
   ```

---

## 📊 Sample Data

### Create Sample Products (via admin)
1. Go to `/admin/products`
2. Create multiple products with:
   - Different SKUs
   - Different categories
   - Varied prices

### Add Stock to Multiple Warehouses
1. Go to `/inventory/stock`
2. For each product:
   - Adjust stock at NY warehouse
   - Adjust stock at LA warehouse
   - Adjust stock at Chicago warehouse
3. This creates diverse inventory data

### Generate Multiple Transfers
1. Create transfers between different warehouses
2. Approve some, leave some pending
3. This creates varied transfer data for testing

### Trigger Alerts
1. Adjust stock below reorder points
2. Click "Check for Alerts"
3. Try different severity levels by adjusting quantities

---

## 🎯 Production Checklist

Before deploying to production:

- [ ] Environment variables configured
  - [ ] `NEXT_PUBLIC_API_URL` points to production backend
  - [ ] `DATABASE_URL` points to production database
  - [ ] JWT secrets configured

- [ ] Database
  - [ ] Production database created
  - [ ] Schema applied: `npx prisma migrate deploy`
  - [ ] Seed data loaded (warehouses)

- [ ] Security
  - [ ] CORS configured for production domain
  - [ ] API rate limiting enabled
  - [ ] Admin-only routes protected
  - [ ] SSL/TLS certificates configured

- [ ] Performance
  - [ ] Frontend built: `npm run build`
  - [ ] Backend built: `npm run build`
  - [ ] Database indexes verified
  - [ ] Image optimization enabled

- [ ] Monitoring
  - [ ] Error logging configured
  - [ ] Performance monitoring setup
  - [ ] Cron job monitoring
  - [ ] Alert notifications configured

- [ ] Testing
  - [ ] All 8 pages tested
  - [ ] CRUD operations verified
  - [ ] Filter functionality tested
  - [ ] Mobile responsiveness checked
  - [ ] Cross-browser testing done

---

## 📞 Support

### Common Questions

**Q: Can I customize the warehouses?**
A: Yes! Go to `/inventory/warehouses` and edit any warehouse details.

**Q: How do I change reorder points?**
A: Reorder points are set per product. Currently managed in product settings.

**Q: Can I export data?**
A: Export functionality is planned for Phase 47. Currently, data is view-only in UI.

**Q: How accurate are forecasts?**
A: Forecasts are based on 90-day historical data. Confidence scores indicate reliability (80%+ is good).

**Q: What happens if I cancel a transfer?**
A: Cancelled transfers don't affect stock levels. Only approved/received transfers move inventory.

**Q: Can I delete alerts?**
A: Alerts can be resolved but not deleted. Resolved alerts are cleaned up after 90 days automatically.

**Q: How do backorders work?**
A: Backorders are created when orders can't be fulfilled. They're fulfilled in priority order (oldest first) when stock becomes available.

---

## 🎉 You're Ready!

Your inventory management system is fully operational. Explore all 8 pages and test the features!

**Happy Inventory Management! 📦**
