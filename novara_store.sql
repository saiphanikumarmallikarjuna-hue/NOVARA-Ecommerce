-- NOVARA E-COMMERCE DATABASE
-- Fresh database setup for MySQL / MySQL Workbench

CREATE DATABASE IF NOT EXISTS novara_store
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE novara_store;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(80) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    description TEXT,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_products_category (category)
);

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    payment_method VARCHAR(30) NOT NULL DEFAULT 'COD',
    payment_status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    payment_reference VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_orders_email (email),
    INDEX idx_orders_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE SET NULL
);

-- Optional sample products:
-- INSERT INTO products (name, category, price, image_url, description, stock)
-- VALUES
-- ('Classic T-Shirt', 'Fashion', 799, 'IMAGE_URL', 'Comfortable everyday t-shirt', 20),
-- ('Wireless Headphones', 'Electronics', 2499, 'IMAGE_URL', 'Wireless over-ear headphones', 10),
-- ('Everyday Watch', 'Accessories', 1499, 'IMAGE_URL', 'Simple everyday watch', 15);
