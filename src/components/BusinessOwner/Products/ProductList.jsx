import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit, Trash2, Eye, Search, Filter, Grid, List, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';
import ProductListItem from './ProductListItem';
import emptyBoxImage from '../../../assets/empty-box.svg';
import './Products.css';

const ProductList = ({ products, onEdit, onDelete, onView, onAdd, onToggleAvailability }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [filteredProducts, setFilteredProducts] = useState(products || []);

    // Category options for filtering
    const categoryOptions = [
        'All Categories',
        'Electronics',
        'Fashion',
        'Home Decor',
        'Food & Beverages',
        'Beauty & Personal Care',
        'Health & Wellness',
        'Education & Training',
        'Professional Services',
        'Arts & Crafts',
        'Sports & Fitness',
        'Travel & Tourism',
        'Entertainment',
        'Automotive',
        'Real Estate',
    ];

    // Filter products based on search term and category
    useEffect(() => {
        let result = [...(products || [])];

        // Apply search filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            result = result.filter(
                product =>
                    product.name.toLowerCase().includes(searchLower) ||
                    product.description.toLowerCase().includes(searchLower) ||
                    product.tags.some(tag => tag.toLowerCase().includes(searchLower))
            );
        }

        // Apply category filter
        if (filterCategory && filterCategory !== 'All Categories') {
            result = result.filter(product => product.category === filterCategory);
        }

        setFilteredProducts(result);
    }, [searchTerm, filterCategory, products]);

    // Handle search input change
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // Handle category filter change
    const handleCategoryChange = (e) => {
        setFilterCategory(e.target.value);
    };

    // Toggle view mode between grid and list
    const toggleViewMode = (mode) => {
        setViewMode(mode);
    };

    // Animations for list items
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="product-management-theme product-list-container">
            <div className="product-list-header">
                <h2>Your Products</h2>
                <button className="btn btn-primary add-product-btn" onClick={onAdd}>
                    <Plus size={16} className="me-1" /> Add New Product
                </button>
            </div>

            <div className="product-filters">
                <div className="search-filter">
                    <div className="input-group">
                        <span className="input-group-text">
                            <Search size={18} />
                        </span>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                        />
                    </div>
                </div>

                <div className="category-filter">
                    <div className="input-group">
                        <span className="input-group-text">
                            <Filter size={18} />
                        </span>
                        <select
                            className="form-select"
                            value={filterCategory}
                            onChange={handleCategoryChange}
                        >
                            {categoryOptions.map(category => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="view-toggle">
                    <button
                        className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                        onClick={() => toggleViewMode('grid')}
                    >
                        <Grid size={20} />
                    </button>
                    <button
                        className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => toggleViewMode('list')}
                    >
                        <List size={20} />
                    </button>
                </div>
            </div>

            {filteredProducts.length === 0 ? (
                <div className="no-products">
                    <div className="no-products-content">
                        <img
                            src={emptyBoxImage}
                            alt="No products"
                            className="no-products-image"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://via.placeholder.com/150?text=No+Products';
                            }}
                        />
                        <h3>No products found</h3>
                        <p>
                            {products.length === 0
                                ? "You haven't added any products yet."
                                : "No products match your search criteria."}
                        </p>
                        {products.length === 0 && (
                            <button className="btn btn-primary" onClick={onAdd}>
                                Add Your First Product
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <AnimatePresence>
                    {viewMode === 'grid' ? (
                        <motion.div
                            className="products-grid"
                            variants={container}
                            initial="hidden"
                            animate="show"
                        >
                            {filteredProducts.map(product => (
                                <motion.div key={product.productId} variants={item}>
                                    <ProductCard
                                        product={product}
                                        onEdit={() => onEdit(product)}
                                        onDelete={() => onDelete(product.productId)}
                                        onView={() => onView(product)}
                                        onToggleAvailability={onToggleAvailability}
                                    />
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            className="products-list"
                            variants={container}
                            initial="hidden"
                            animate="show"
                        >
                            <div className="list-header">
                                <div className="list-cell">Image</div>
                                <div className="list-cell">Name</div>
                                <div className="list-cell">Category</div>
                                <div className="list-cell">Price</div>
                                <div className="list-cell">Stock</div>
                                <div className="list-cell">Status</div>
                                <div className="list-cell">Actions</div>
                            </div>
                            {filteredProducts.map(product => (
                                <motion.div key={product.productId} variants={item}>
                                    <ProductListItem
                                        product={product}
                                        onEdit={() => onEdit(product)}
                                        onDelete={() => onDelete(product.productId)}
                                        onView={() => onView(product)}
                                        onToggleAvailability={onToggleAvailability}
                                    />
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    );
};

export default ProductList;
