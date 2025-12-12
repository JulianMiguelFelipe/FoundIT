# FoundIT: Campus Lost & Found System

A browser-based, mobile-friendly solution for reporting and recovering lost items across campus. FoundIT simplifies the process with intuitive upload and discovery interfaces — now live and publicly accessible.

**Live Website:**  
[https://foundit-z3gz.onrender.com](https://foundit-z3gz.onrender.com)

---

## 📸 Preview
*(Insert screenshot of homepage or item cards here)*

---

## ✨ Key Features

### 🧍 Submitter Interface (`/form.html`)
- Report lost or found items with complete details and image support  
- Automatically saves submissions to the shared database  
- Clean, responsive form layout with instant feedback  

### 🕵️‍♂️ Finder Interface (`/items.html`)
- Browse uploaded items with image previews  
- View item details including description, location, and contact information  
- Mobile-optimized card layout for quick scanning and easy navigation  
- Search bar and sorting options (Newest → Oldest, A–Z by item name)  

### ⚙️ Management Features
- **Manage Submissions:** Users can verify their identity (email + student number) to view and manage their own reported items  
- **Mark as Returned:** Reporters can update the status of items once they are returned to the rightful owner  
- **Delete Records:** Option to remove outdated or incorrect submissions  

---

## 🧰 Tech Stack

| Layer            | Technology                          |
|------------------|-------------------------------------|
| **Frontend**     | HTML, CSS, Bootstrap, JavaScript    |
| **Backend**      | Node.js + Express                   |
| **Database**     | PostgreSQL (production) / JSON file (`items.json`) for local testing |
| **Image Hosting**| Cloudinary (secure image storage)   |
| **Hosting**      | Render (public deployment)          |
| **Version Control** | Git + GitHub                     |

---

## 👥 Contributor

- **Julian Miguel I. Felipe**  
*(Add more names if applicable)*

---

## 🚀 Getting Started (Local Setup)

### 🔧 Prerequisites
- Node.js installed  
- Modern browser (Chrome, Firefox, Edge, Safari)

### 📦 Installation

```bash
# Clone the repository
git clone https://github.com/JulianMiguelFelipe/FoundIT.git

# Navigate to the project folder
cd FoundIT

# Install dependencies
npm install

# Start the server
npm start
