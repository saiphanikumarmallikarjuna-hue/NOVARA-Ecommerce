# NOVARA Ecommerce

A simple full-stack e-commerce website built with HTML, CSS, JavaScript, Node.js, Express.js, and MySQL.

## Features

- User registration and login
- Product listing and shopping cart
- Add to Bag and quantity controls
- Stock validation and automatic stock reduction
- Cash on Delivery (COD)
- UPI checkout flow
- Debit/Credit card checkout validation (demo flow)
- Customer order history / previous orders
- Admin login and dashboard
- Admin add, edit, and delete products
- Admin order viewing
- MySQL database integration

## Technologies Used

- HTML5
- CSS3
- JavaScript
- Node.js
- Express.js
- MySQL
- bcryptjs
- mysql2
- dotenv
- cors

## Project Structure

text
NOVARA-Ecommerce/
├── public/
│   ├── index.html
│   ├── admin.html
│   ├── app.js
│   └── style.css
├── novara_store.sql
├── server.js
├── package.json
├── package-lock.json
├── .gitignore
└── README.md

## Requirements

Install these before running the project:

- Node.js
- npm
- MySQL / MySQL Workbench
- Git (only needed when working with the GitHub repository)

## Setup

### 1. Clone the repository

bash
git clone https://github.com/saiphanikumarmallikarjuna-hue/NOVARA-Ecommerce.git
cd NOVARA-Ecommerce

### 2. Install dependencies

bash
npm install

### 3. Create the MySQL database

Open MySQL Workbench and run the SQL file:
text
novara_store.sql

This creates the database and the required tables for the project.

### 4. Create the .env file

Create a file named `.env` in the project root.

Example:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=novara_store
SESSION_SECRET=change_this_secret

ADMIN_EMAIL=novara@gmail.com
ADMIN_PASSWORD=your_admin_password

### 5. Start the server

bash
npm start

For development with automatic restart:

bash
npm run dev

### 6. Open the website

Customer website:

text
http://localhost:3000

Admin dashboard:
text
http://localhost:3000/admin.html

Use the admin credentials configured in `.env`.

## Payment Note

The UPI and card features in this project are **demo payment flows for a student project**.

- COD creates an order with a pending payment status.
- UPI accepts a UPI ID/reference as part of the demo flow.
- Card details are validated in the application, but the full card number and CVV are not stored.

For a real e-commerce application, use a payment gateway such as Razorpay or Stripe and verify payment results securely on the server.

## Main API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/products` | Get all products |
| POST | /api/register| Create a customer account |
| POST | /api/login| Customer login |
| POST | /api/orders | Place an order |
| GET | /api/orders?email=...| Get customer order history |
| POST | /api/admin/login | Admin login |
| POST | /api/admin/products| Add a product |
| PUT | /api/admin/products/:id | Edit a product |
| DELETE | /api/admin/products/:id | Delete a product |
| GET | /api/admin/orders | View all orders |

## Database

The main database is:

text
novara_store

The project uses tables for users, products, orders, and order items.

On startup, the server also checks for the payment-related columns in the orders table and attempts to add them if they are missing.

## GitHub

Repository:

https://github.com/saiphanikumarmallikarjuna-hue/NOVARA-Ecommerce

## Notes

- Do not commit .env or `node_modules.
- Do not share database passwords or admin passwords publicly.
- Run MySQL before starting the Node.js server.
- If the project is downloaded fresh, run npm install before `npm start`.
