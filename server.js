
// ========================================
// 1. IMPORT PACKAGES
// ========================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const path = require("path");


// ========================================
// 2. CREATE EXPRESS APP
// ========================================

const app = express();


// ========================================
// 3. MIDDLEWARE
// ========================================

app.use(cors());
app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// ========================================
// 4. MYSQL DATABASE CONNECTION
// ========================================

const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "root",
    database: process.env.DB_NAME || "novara_store",

    waitForConnections: true,
    connectionLimit: 10
});

// Add new order/payment columns to older NOVARA databases.
// Existing columns are left untouched.
async function prepareDatabase() {
    // Create missing tables automatically so a fresh MySQL database can run
    // without requiring a separate manual setup step.
    const tables = [
        `CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            category VARCHAR(80) NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            image_url TEXT,
            description TEXT,
            stock INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_name VARCHAR(100) NOT NULL,
            email VARCHAR(255) NOT NULL,
            total DECIMAL(10,2) NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS order_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NOT NULL,
            product_id INT NULL,
            quantity INT NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    for (const sql of tables) {
        try {
            await db.query(sql);
        } catch (err) {
            console.warn("Database table setup warning:", err.message);
        }
    }

    const changes = [
        `ALTER TABLE orders ADD COLUMN payment_method VARCHAR(30) NOT NULL DEFAULT 'COD'`,
        `ALTER TABLE orders ADD COLUMN payment_status VARCHAR(30) NOT NULL DEFAULT 'Pending'`,
        `ALTER TABLE orders ADD COLUMN payment_reference VARCHAR(100) NULL`
    ];

    for (const sql of changes) {
        try {
            await db.query(sql);
        } catch (err) {
            // MySQL error 1060 means the column already exists.
            if (err.errno !== 1060) {
                console.warn("Database update skipped:", err.message);
            }
        }
    }
}


// ========================================
// 5. GET ALL PRODUCTS
// ========================================

app.get("/api/products", async (req, res) => {

    try {

        const [rows] = await db.query(
            "SELECT * FROM products ORDER BY id DESC"
        );

        res.json(rows);

    } catch (err) {

        res.status(500).json({
            message: "Could not load products"
        });

    }
});


// ========================================
// 6. USER REGISTRATION
// ========================================

app.post("/api/register", async (req, res) => {

    const {
        name,
        email,
        password
    } = req.body;


    // Check required fields
    if (
        !name ||
        !email ||
        !password ||
        password.length < 6
    ) {

        return res.status(400).json({
            message:
                "Enter all fields. Password must be 6+ characters."
        });
    }


    try {

        // Encrypt password
        const hash = await bcrypt.hash(
            password,
            10
        );


        // Insert user into database
        await db.query(
            `INSERT INTO users
            (name, email, password_hash)
            VALUES (?, ?, ?)`,
            [
                name,
                email,
                hash
            ]
        );


        res.status(201).json({
            message:
                "Account created. You can now sign in."
        });

    } catch (err) {

        res.status(400).json({
            message:
                err.code === "ER_DUP_ENTRY"
                    ? "Email already registered"
                    : "Registration failed"
        });

    }
});


// ========================================
// 7. USER LOGIN
// ========================================

app.post("/api/login", async (req, res) => {

    const {
        email,
        password
    } = req.body;


    try {

        // Find user by email
        const [rows] = await db.query(
            "SELECT * FROM users WHERE email=?",
            [email]
        );


        // Check email and password
        if (
            !rows.length ||
            !(await bcrypt.compare(
                password,
                rows[0].password_hash
            ))
        ) {

            return res.status(401).json({
                message:
                    "Invalid email or password"
            });
        }


        // Login successful
        res.json({

            message: "Login successful",

            user: {
                id: rows[0].id,
                name: rows[0].name,
                email: rows[0].email
            }

        });

    } catch (err) {

        res.status(500).json({
            message: "Login failed"
        });

    }
});


// ========================================
// 8. PAYMENT VALIDATION HELPERS
// ========================================

function isValidUpiId(value) {
    return /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/.test(String(value || "").trim());
}

function isValidLuhn(value) {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length !== 16) return false;

    let sum = 0;
    let doubleDigit = false;

    for (let i = digits.length - 1; i >= 0; i--) {
        let digit = Number(digits[i]);

        if (doubleDigit) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }

        sum += digit;
        doubleDigit = !doubleDigit;
    }

    return sum % 10 === 0;
}

function isValidExpiry(value) {
    const match = String(value || "").trim().match(/^(\d{2})\/(\d{2})$/);
    if (!match) return false;

    const month = Number(match[1]);
    const year = 2000 + Number(match[2]);

    if (month < 1 || month > 12) return false;

    const now = new Date();
    const currentMonth = now.getFullYear() * 12 + now.getMonth();
    const expiryMonth = year * 12 + month - 1;

    return expiryMonth >= currentMonth;
}


// ========================================
// 9. PLACE ORDER
// ========================================

app.post("/api/orders", async (req, res) => {
    const {
        customer_name,
        email,
        items,
        payment_method,
        payment_reference
    } = req.body;

    const allowedPayments = ["COD", "UPI", "CARD"];
    const method = String(payment_method || "COD").toUpperCase();

    if (
        !customer_name ||
        !email ||
        !Array.isArray(items) ||
        !items.length ||
        !allowedPayments.includes(method)
    ) {
        return res.status(400).json({
            message: "Customer details, cart items and a valid payment method are required"
        });
    }

    if (method === "UPI" && !isValidUpiId(payment_reference)) {
        return res.status(400).json({ message: "Enter a valid UPI ID, for example name@upi" });
    }

    // Demo card validation only. Never store the full card number or CVV.
    if (method === "CARD") {
        const cardNumber = String(req.body.card_number || "").replace(/\D/g, "");
        const expiry = String(req.body.card_expiry || "").trim();
        const cvv = String(req.body.card_cvv || "").replace(/\D/g, "");

        if (!isValidLuhn(cardNumber)) {
            return res.status(400).json({ message: "Enter a valid 16-digit card number" });
        }

        if (!isValidExpiry(expiry)) {
            return res.status(400).json({ message: "Enter a valid future card expiry date in MM/YY format" });
        }

        if (cvv.length !== 3) {
            return res.status(400).json({ message: "CVV must contain exactly 3 digits" });
        }
    }

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        let total = 0;
        const validated = [];
        const requested = new Map();

        // Combine duplicate product IDs so a malformed request cannot bypass stock checks.
        for (const item of items) {
            const productId = Number(item.id);
            const qty = Number(item.quantity);

            if (!Number.isInteger(productId) || productId < 1 ||
                !Number.isInteger(qty) || qty < 1) {
                throw new Error("Invalid product or quantity in cart");
            }

            requested.set(productId, (requested.get(productId) || 0) + qty);
        }

        for (const [productId, qty] of requested) {
            const [rows] = await conn.query(
                `SELECT id, name, price, stock
                 FROM products
                 WHERE id=?
                 FOR UPDATE`,
                [productId]
            );

            if (!rows.length || Number(rows[0].stock) < qty) {
                throw new Error(`${rows.length ? rows[0].name : "A product"} is out of stock or has insufficient stock`);
            }

            total += Number(rows[0].price) * qty;
            validated.push({ product: rows[0], qty });
        }

        const paymentStatus = method === "COD" ? "Pending" : "Paid";
        const safeReference = method === "UPI"
            ? String(payment_reference).slice(0, 100)
            : method === "CARD"
                ? `CARD-${Date.now()}`
                : null;

        const [order] = await conn.query(
            `INSERT INTO orders
            (customer_name, email, total, status, payment_method, payment_status, payment_reference)
            VALUES (?, ?, ?, 'Pending', ?, ?, ?)`,
            [customer_name, email, total, method, paymentStatus, safeReference]
        );

        for (const item of validated) {
            await conn.query(
                `INSERT INTO order_items
                (order_id, product_id, quantity, price)
                VALUES (?, ?, ?, ?)`,
                [order.insertId, item.product.id, item.qty, item.product.price]
            );

            await conn.query(
                `UPDATE products
                 SET stock=stock-?
                 WHERE id=? AND stock>=?`,
                [item.qty, item.product.id, item.qty]
            );
        }

        await conn.commit();

        res.status(201).json({
            message: method === "COD" ? "Order placed successfully" : "Payment successful and order placed",
            orderId: order.insertId,
            total,
            paymentMethod: method,
            paymentStatus
        });
    } catch (err) {
        await conn.rollback();
        res.status(400).json({ message: err.message || "Could not place order" });
    } finally {
        conn.release();
    }
});

// ========================================
// 9. CUSTOMER ORDER HISTORY
// ========================================

app.get("/api/orders", async (req, res) => {
    const email = String(req.query.email || "").trim();

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        const [orders] = await db.query(
            `SELECT id, customer_name, email, total, status,
                    payment_method, payment_status, created_at
             FROM orders
             WHERE email=?
             ORDER BY created_at DESC`,
            [email]
        );

        for (const order of orders) {
            const [items] = await db.query(
                `SELECT oi.product_id, oi.quantity, oi.price, p.name
                 FROM order_items oi
                 LEFT JOIN products p ON p.id=oi.product_id
                 WHERE oi.order_id=?`,
                [order.id]
            );
            order.items = items;
        }

        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: "Could not load order history" });
    }
});


// ========================================
// 10. ADMIN LOGIN

// ========================================

app.post("/api/admin/login", (req, res) => {

    const {
        email,
        password
    } = req.body;


    if (
        email === process.env.ADMIN_EMAIL &&
        password === process.env.ADMIN_PASSWORD
    ) {

        return res.json({

            message:
                "Admin login successful",

            token:
                process.env.ADMIN_PASSWORD

        });
    }


    res.status(401).json({
        message:
            "Invalid admin credentials"
    });
});


// ========================================
// 10. ADMIN AUTHENTICATION
// ========================================

function adminOnly(req, res, next) {

    const token =
        req.headers["x-admin-token"];


    if (
        token &&
        token === process.env.ADMIN_PASSWORD
    ) {

        return next();
    }


    return res.status(401).json({
        message:
            "Admin login required"
    });
}


// ========================================
// 11. ADMIN - ADD PRODUCT
// ========================================

app.post(
    "/api/admin/products",
    adminOnly,
    async (req, res) => {

        const {
            name,
            category,
            price,
            image_url,
            description,
            stock
        } = req.body;


        // Validate product
        if (
            !name ||
            !category ||
            Number(price) <= 0
        ) {

            return res.status(400).json({
                message:
                    "Enter product name, category and valid price"
            });
        }


        try {

            const [result] =
                await db.query(

                    `INSERT INTO products
                    (name, category, price,
                     image_url, description, stock)
                    VALUES (?, ?, ?, ?, ?, ?)`,

                    [
                        name,
                        category,
                        price,
                        image_url || "",
                        description || "",
                        stock || 0
                    ]
                );


            res.status(201).json({

                message:
                    "Product added",

                id:
                    result.insertId

            });


        } catch (err) {

            res.status(500).json({
                message:
                    "Could not add product"
            });

        }
    }
);


// ========================================
// 12. ADMIN - EDIT PRODUCT
// ========================================

app.put(
    "/api/admin/products/:id",
    adminOnly,
    async (req, res) => {
        const { name, category, price, image_url, description, stock } = req.body;
        const productId = Number(req.params.id);

        if (!productId || !name || !category || Number(price) <= 0 || !Number.isInteger(Number(stock)) || Number(stock) < 0) {
            return res.status(400).json({ message: "Enter valid product details and stock" });
        }

        try {
            const [result] = await db.query(
                `UPDATE products
                 SET name=?, category=?, price=?, image_url=?, description=?, stock=?
                 WHERE id=?`,
                [name, category, price, image_url || "", description || "", stock, productId]
            );

            if (!result.affectedRows) {
                return res.status(404).json({ message: "Product not found" });
            }

            res.json({ message: "Product updated" });
        } catch (err) {
            res.status(500).json({ message: "Could not update product" });
        }
    }
);


// ========================================
// 12. ADMIN - DELETE PRODUCT
// ========================================

app.delete(
    "/api/admin/products/:id",
    adminOnly,
    async (req, res) => {

        try {

            await db.query(
                "DELETE FROM products WHERE id=?",
                [req.params.id]
            );


            res.json({
                message:
                    "Product deleted"
            });


        } catch (err) {

            res.status(500).json({
                message:
                    "Could not delete product"
            });

        }
    }
);


// ========================================
// 13. ADMIN - VIEW ORDERS
// ========================================

app.get(
    "/api/admin/orders",
    adminOnly,
    async (req, res) => {

        try {

            const [rows] =
                await db.query(
                    `SELECT *
                     FROM orders
                     ORDER BY created_at DESC`
                );


            res.json(rows);


        } catch (err) {

            res.status(500).json({
                message:
                    "Could not load orders"
            });

        }
    }
);


// ========================================
// 14. START SERVER
// ========================================

const PORT = process.env.PORT || 3000;

(async () => {
    await prepareDatabase();
    app.listen(PORT, () => {
        console.log(`NOVARA running at http://localhost:${PORT}`);
    });
})();
