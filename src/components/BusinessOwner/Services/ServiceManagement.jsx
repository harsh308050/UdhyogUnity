import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Clock, Users, IndianRupee, Calendar, Tag, CheckCircle, XCircle, Grid, List, Search, Filter, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { addService, updateService, deleteService, getBusinessServices, toggleServiceStatus } from '../../../Firebase/serviceDb';
import { uploadToCloudinary, formatCloudinaryFolder } from '../../../Firebase/cloudinary';
import { doc } from 'firebase/firestore';
import { db } from '../../../Firebase/config';
import '../Products/Products.css';
import ServiceView from './ServiceView';

const ServiceManagement = ({ businessData }) => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list', 'add', 'edit', 'view'
    const [selectedService, setSelectedService] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    const navigate = useNavigate();

    // Fetch services on component mount
    useEffect(() => {
        fetchServices();
    }, [businessData]);

    // Mobile detection effect
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            // Force list view on mobile for better UX
            if (mobile && viewMode === 'grid') {
                setViewMode('list');
            }
        };

        window.addEventListener('resize', handleResize);

        // Set initial state
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, [viewMode]);

    // Fetch services from Firestore
    const fetchServices = async () => {
        try {
            setLoading(true);

            if (!businessData || !businessData.email) {
                console.error("Business data is missing or incomplete");
                setLoading(false);
                return;
            }

            const servicesData = await getBusinessServices(businessData);

            console.log("Fetched services:", servicesData);
            setServices(servicesData);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching services:", error);
            toast.error("Failed to load services. Please try again.");
            setLoading(false);
        }
    };

    // Handle search and filters
    const filteredServices = services.filter(service => {
        const matchesSearch = searchTerm === '' ||
            service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCategory = categoryFilter === '' || service.category === categoryFilter;

        return matchesSearch && matchesCategory;
    });

    // Get unique categories for filter dropdown
    const categories = [...new Set(services.map(service => service.category))].filter(Boolean);

    // Handle service CRUD operations
    const handleAddService = async (serviceData) => {
        try {
            setUploading(true);

            // Call the service module's addService function
            const newService = await addService(serviceData, businessData);

            console.log("Service added with ID:", newService.id);

            // Update local state
            setServices(prev => [...prev, newService]);
            setView('list');
            toast.success("Service added successfully!");
            setUploading(false);
        } catch (error) {
            console.error("Error adding service:", error);
            toast.error("Failed to add service. Please try again.");
            setUploading(false);
        }
    };

    const handleUpdateService = async (serviceId, serviceData) => {
        try {
            setUploading(true);

            // Call the service module's updateService function
            const updatedService = await updateService(serviceId, serviceData, businessData);

            // Update local state
            setServices(prev => prev.map(service =>
                service.id === serviceId ? updatedService : service
            ));

            setView('list');
            toast.success("Service updated successfully!");
            setUploading(false);
        } catch (error) {
            console.error("Error updating service:", error);
            toast.error("Failed to update service. Please try again.");
            setUploading(false);
        }
    };

    const handleDeleteService = async (serviceId) => {
        try {
            // Delete from Firestore using the service module
            await deleteService(serviceId, businessData);

            // Update local state
            setServices(prev => prev.filter(service => service.id !== serviceId));

            setConfirmDelete(null);
            toast.success("Service deleted successfully!");
        } catch (error) {
            console.error("Error deleting service:", error);
            toast.error("Failed to delete service. Please try again.");
        }
    };

    // Handle toggling service active status
    const handleToggleServiceStatus = async (serviceId, isActive) => {
        try {
            // Toggle status using the service module
            const updatedService = await toggleServiceStatus(serviceId, isActive, businessData);

            // Update local state
            setServices(prev => prev.map(service =>
                service.id === serviceId ? updatedService : service
            ));

            toast.success(`Service ${isActive ? 'activated' : 'deactivated'} successfully!`);
        } catch (error) {
            console.error("Error toggling service status:", error);
            toast.error(`Failed to ${isActive ? 'activate' : 'deactivate'} service. Please try again.`);
        }
    };

    // UI Components
    const renderServiceList = () => {
        return (
            <div className="product-list-container">
                <div className="product-list-header">
                    <h2>Services</h2>
                    <button
                        className="btn-primary add-product-btn"
                        onClick={() => setView('add')}
                    >
                        <Plus size={18} />
                        Add New Service
                    </button>
                </div>

                <div className="product-filters">
                    <div className="search-filter">
                        <div className="input-group">
                            <div className="input-group-text">
                                <Search size={16} />
                            </div>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search services..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="category-filter">
                        <select
                            className="form-select"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {categories.map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </div>
                    {!isMobile && (
                        <div className="view-toggle">
                            <button
                                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                onClick={() => setViewMode('grid')}
                                title="Grid View"
                            >
                                <Grid size={18} />
                            </button>
                            <button
                                className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                                onClick={() => setViewMode('list')}
                                title="List View"
                            >
                                <List size={18} />
                            </button>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="loading-container">
                        <div className="spinner"></div>
                        <p>Loading services...</p>
                    </div>
                ) : filteredServices.length === 0 ? (
                    <div className="no-products">
                        <div className="no-products-content">
                            <img
                                src="https://cdn-icons-png.flaticon.com/512/4076/4076432.png"
                                alt="No services"
                                className="no-products-image"
                            />
                            <h3>No services found</h3>
                            <p>
                                {searchTerm || categoryFilter
                                    ? "No services match your search criteria. Try adjusting your filters."
                                    : "You haven't added any services yet. Click the button below to add your first service."}
                            </p>
                            <button
                                className="btn-primary"
                                onClick={() => setView('add')}
                            >
                                <Plus size={18} />
                                Add New Service
                            </button>
                        </div>
                    </div>
                ) : (isMobile || viewMode === 'list') ? (
                    <div className="products-list">
                        {!isMobile && (
                            <div className="list-header">
                                <div className="list-cell">Image</div>
                                <div className="list-cell">Service Name</div>
                                <div className="list-cell">Category</div>
                                <div className="list-cell">Duration</div>
                                <div className="list-cell">Price</div>
                                <div className="list-cell">Status</div>
                                <div className="list-cell">Actions</div>
                            </div>
                        )}
                        {filteredServices.map(service => (
                            <ServiceListItem
                                key={service.id}
                                service={service}
                                isMobile={isMobile}
                                onEdit={() => {
                                    setSelectedService(service);
                                    setView('edit');
                                }}
                                onDelete={() => setConfirmDelete(service)}
                                onView={() => {
                                    setSelectedService(service);
                                    setView('view');
                                }}
                            />
                        ))}
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="products-grid">
                        {filteredServices.map(service => (
                            <ServiceCard
                                key={service.id}
                                service={service}
                                onEdit={() => {
                                    setSelectedService(service);
                                    setView('edit');
                                }}
                                onDelete={() => setConfirmDelete(service)}
                                onView={() => {
                                    setSelectedService(service);
                                    setView('view');
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="products-list">
                        {!isMobile && (
                            <div className="list-header">
                                <div className="list-cell">Image</div>
                                <div className="list-cell">Service Name</div>
                                <div className="list-cell">Category</div>
                                <div className="list-cell">Duration</div>
                                <div className="list-cell">Price</div>
                                <div className="list-cell">Status</div>
                                <div className="list-cell">Actions</div>
                            </div>
                        )}
                        {filteredServices.map(service => (
                            <ServiceListItem
                                key={service.id}
                                service={service}
                                isMobile={isMobile}
                                onEdit={() => {
                                    setSelectedService(service);
                                    setView('edit');
                                }}
                                onDelete={() => setConfirmDelete(service)}
                                onView={() => {
                                    setSelectedService(service);
                                    setView('view');
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {confirmDelete && (
                    <div className="modal-overlay">
                        <div className="confirm-modal">
                            <h3>Delete Service</h3>
                            <p>Are you sure you want to delete "{confirmDelete.name}"? This action cannot be undone.</p>
                            <div className="modal-actions">
                                <button
                                    className="btn-outline-secondary"
                                    onClick={() => setConfirmDelete(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn-danger"
                                    onClick={() => handleDeleteService(confirmDelete.id)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Upload Progress Modal */}
                {uploading && (
                    <div className="upload-overlay">
                        <div className="upload-modal">
                            <div className="spinner"></div>
                            <p>Processing service data...</p>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Main render method
    const renderContent = () => {
        switch (view) {
            case 'list':
                return renderServiceList();
            case 'add':
                return (
                    <ServiceForm
                        onSubmit={handleAddService}
                        onCancel={() => setView('list')}
                    />
                );
            case 'edit':
                return (
                    <ServiceForm
                        service={selectedService}
                        onSubmit={(formData) => handleUpdateService(selectedService.id, formData)}
                        onCancel={() => setView('list')}
                    />
                );
            case 'view':
                return (
                    <ServiceView
                        service={selectedService}
                        onBack={() => setView('list')}
                        onEdit={() => setView('edit')}
                    />
                );
            default:
                return renderServiceList();
        }
    };

    return (
        <motion.div
            className="service-management-container product-management-theme"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            {renderContent()}
        </motion.div>
    );
};

// Service Card Component
const ServiceCard = ({ service, onEdit, onDelete, onView }) => {
    // Get the first image as main display image
    const displayImage = service.images && service.images.length > 0
        ? service.images[0].preview || service.images[0].url
        : 'https://via.placeholder.com/300x200?text=No+Image';

    // Format price with Indian Rupee symbol
    const formatPrice = (price) => {
        return `₹${parseFloat(price).toLocaleString('en-IN')}`;
    };

    // Format duration
    const formatDuration = (duration) => {
        if (!duration) return 'N/A';
        if (duration < 60) return `${duration} min`;
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
    };

    return (
        <motion.div
            className="product-card"
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
        >
            <div className="product-image-container">
                <img src={displayImage} alt={service.name} className="product-image" />
                {!service.isActive && (
                    <div className="inactive-overlay">
                        Inactive
                    </div>
                )}
            </div>
            <div className="product-details">
                <h3 className="product-name">{service.name}</h3>
                <div className="product-category">
                    <Tag className="category-icon" size={16} />
                    {service.category || 'Uncategorized'}
                </div>
                <div className="product-price">
                    {service.discountedPrice ? (
                        <>
                            <span className="original-price">{formatPrice(service.price)}</span>
                            <span className="discounted-price">{formatPrice(service.discountedPrice)}</span>
                        </>
                    ) : (
                        <span className="regular-price">{formatPrice(service.price)}</span>
                    )}
                </div>
                <div className="product-stock">
                    <Clock size={16} className="stock-icon" />
                    {formatDuration(service.duration)}
                </div>
                <div className="product-stock">
                    {service.isActive ? (
                        <div className="in-stock">
                            <CheckCircle size={16} className="stock-icon" />
                            Active
                        </div>
                    ) : (
                        <div className="out-of-stock">
                            <XCircle size={16} className="stock-icon" />
                            Inactive
                        </div>
                    )}
                </div>
            </div>
            <div className="product-actions">
                <button
                    className="action-button view-button"
                    onClick={onView}
                    title="View Service"
                >
                    <Eye size={20} />
                </button>
                <button
                    className="action-button edit-button"
                    onClick={onEdit}
                    title="Edit Service"
                >
                    <Edit size={20} />
                </button>
                <button
                    className="action-button delete-button"
                    onClick={onDelete}
                    title="Delete Service"
                >
                    <Trash2 size={20} />
                </button>
            </div>
        </motion.div>
    );
};

// Service List Item Component
const ServiceListItem = ({ service, onEdit, onDelete, onView, isMobile = false }) => {
    // Get the first image as main display image
    const displayImage = service.images && service.images.length > 0
        ? service.images[0].preview || service.images[0].url
        : 'https://via.placeholder.com/300x200?text=No+Image';

    // Format price with Indian Rupee symbol
    const formatPrice = (price) => {
        return `₹${parseFloat(price).toLocaleString('en-IN')}`;
    };

    // Format duration
    const formatDuration = (duration) => {
        if (!duration) return 'N/A';
        if (duration < 60) return `${duration} min`;
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
    };

    if (isMobile) {
        return (
            <div className="mobile-service-card">
                <div className="mobile-service-main">
                    <img src={displayImage} alt={service.name} className="mobile-service-image" />
                    <div className="mobile-service-info">
                        <h3 className="mobile-service-name">{service.name}</h3>
                        <p className="mobile-service-category">{service.category || 'Uncategorized'}</p>
                        <div className="mobile-service-duration">
                            <Clock size={14} />
                            <span>{formatDuration(service.duration)}</span>
                        </div>
                    </div>
                </div>
                <div className="mobile-service-details">
                    <div className="mobile-service-price">
                        {service.discountedPrice ? (
                            <>
                                <span className="mobile-original-price">{formatPrice(service.price)}</span>
                                <span className="mobile-discounted-price">{formatPrice(service.discountedPrice)}</span>
                            </>
                        ) : (
                            <span className="mobile-regular-price">{formatPrice(service.price)}</span>
                        )}
                    </div>
                    <div className="mobile-service-status">
                        <span className={`status-badge ${service.isActive ? 'active' : 'inactive'}`}>
                            {service.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
                <div className="mobile-service-actions">
                    <button className="mobile-action-button view-button" onClick={onView} title="View Service">
                        <Eye size={16} />
                    </button>
                    <button className="mobile-action-button edit-button" onClick={onEdit} title="Edit Service">
                        <Edit size={16} />
                    </button>
                    <button className="mobile-action-button delete-button" onClick={onDelete} title="Delete Service">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="product-list-item">
            <div className="list-cell">
                <img src={displayImage} alt={service.name} className="list-product-image" />
            </div>
            <div className="list-cell">
                <div>{service.name}</div>
            </div>
            <div className="list-cell product-category-cell">
                {service.category || 'Uncategorized'}
            </div>
            <div className="list-cell product-stock-cell">
                <div className="list-in-stock">
                    <Clock size={16} />
                    {formatDuration(service.duration)}
                </div>
            </div>
            <div className="list-cell">
                <div className="price-container">
                    {service.discountedPrice ? (
                        <>
                            <div className="list-original-price">{formatPrice(service.price)}</div>
                            <div className="list-discounted-price">{formatPrice(service.discountedPrice)}</div>
                        </>
                    ) : (
                        <div className="list-regular-price">{formatPrice(service.price)}</div>
                    )}
                </div>
            </div>
            <div className="list-cell product-status-cell">
                <span className={`status-badge ${service.isActive ? 'active' : 'inactive'}`}>
                    {service.isActive ? 'Active' : 'Inactive'}
                </span>
            </div>
            <div className="list-cell">
                <div className="product-actions-cell">
                    <button
                        className="list-action-button view-button"
                        onClick={onView}
                        title="View Service"
                    >
                        <Eye size={16} />
                    </button>
                    <button
                        className="list-action-button edit-button"
                        onClick={onEdit}
                        title="Edit Service"
                    >
                        <Edit size={16} />
                    </button>

                    <button
                        className="list-action-button delete-button"
                        onClick={onDelete}
                        title="Delete Service"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// Service Form Component
const ServiceForm = ({ service, onSubmit, onCancel }) => {
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        price: '',
        discountedPrice: '',
        duration: '',
        capacity: '',
        description: '',
        tags: [],
        images: [],
        isActive: true,
        ...service
    });

    // Tag input state
    const [tagInput, setTagInput] = useState('');

    // Handle input changes
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    // Handle tag input
    const handleTagKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
                setFormData({
                    ...formData,
                    tags: [...formData.tags, tagInput.trim()]
                });
                setTagInput('');
            }
        }
    };

    const removeTag = (tagToRemove) => {
        setFormData({
            ...formData,
            tags: formData.tags.filter(tag => tag !== tagToRemove)
        });
    };

    // Handle image upload
    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);

        const newImages = files.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            name: file.name
        }));

        setFormData({
            ...formData,
            images: [...formData.images, ...newImages]
        });
    };

    const removeImage = (index) => {
        const updatedImages = [...formData.images];

        // Release object URL to prevent memory leaks
        if (updatedImages[index].preview && updatedImages[index].file) {
            URL.revokeObjectURL(updatedImages[index].preview);
        }

        updatedImages.splice(index, 1);

        setFormData({
            ...formData,
            images: updatedImages
        });
    };

    // Form submission
    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate form
        if (!formData.name.trim()) {
            toast.error("Service name is required");
            return;
        }

        if (!formData.price || isNaN(formData.price) || parseFloat(formData.price) <= 0) {
            toast.error("Please enter a valid price");
            return;
        }

        if (formData.discountedPrice && (isNaN(formData.discountedPrice) || parseFloat(formData.discountedPrice) <= 0 || parseFloat(formData.discountedPrice) >= parseFloat(formData.price))) {
            toast.error("Discounted price must be less than regular price");
            return;
        }

        if (!formData.duration || isNaN(formData.duration) || parseFloat(formData.duration) <= 0) {
            toast.error("Please enter a valid duration in minutes");
            return;
        }

        // Prepare data for submission
        const processedData = {
            ...formData,
            price: parseFloat(formData.price),
            discountedPrice: formData.discountedPrice ? parseFloat(formData.discountedPrice) : null,
            duration: parseFloat(formData.duration),
            capacity: formData.capacity ? parseFloat(formData.capacity) : null
        };

        // Clean up any undefined values which Firestore doesn't accept
        Object.keys(processedData).forEach(key => {
            if (processedData[key] === undefined) {
                console.log(`Removing undefined value for key: ${key}`);
                delete processedData[key];
            }
        });

        onSubmit(processedData);
    };

    return (
        <div className="product-form-container">
            <h2 className="form-title">{service ? 'Edit Service' : 'Add New Service'}</h2>

            <form onSubmit={handleSubmit}>
                <div className="form-section">
                    <h3 className="section-title">Basic Information</h3>

                    <div className="form-group">
                        <label htmlFor="name" className="form-label">Service Name*</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            className="form-control"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter service name"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="category" className="form-label">Category</label>
                        <input
                            type="text"
                            id="category"
                            name="category"
                            className="form-control"
                            value={formData.category}
                            onChange={handleChange}
                            placeholder="Enter service category"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description" className="form-label">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            className="form-control description-textarea"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Describe your service"
                            rows={5}
                        />
                    </div>
                </div>

                <div className="form-section">
                    <h3 className="section-title">Pricing & Duration</h3>

                    <div className="row">
                        <div className="col-md-6">
                            <div className="form-group">
                                <label htmlFor="price" className="form-label">Regular Price (₹)*</label>
                                <input
                                    type="number"
                                    id="price"
                                    name="price"
                                    className="form-control"
                                    value={formData.price}
                                    onChange={handleChange}
                                    placeholder="Enter price"
                                    min="0"
                                    step="0.01"
                                    required
                                />
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="form-group">
                                <label htmlFor="discountedPrice" className="form-label">Discounted Price (₹)</label>
                                <input
                                    type="number"
                                    id="discountedPrice"
                                    name="discountedPrice"
                                    className="form-control"
                                    value={formData.discountedPrice}
                                    onChange={handleChange}
                                    placeholder="Enter discounted price (optional)"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-6">
                            <div className="form-group">
                                <label htmlFor="duration" className="form-label">Duration (minutes)*</label>
                                <input
                                    type="number"
                                    id="duration"
                                    name="duration"
                                    className="form-control"
                                    value={formData.duration}
                                    onChange={handleChange}
                                    placeholder="Enter service duration in minutes"
                                    min="1"
                                    required
                                />
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="form-group">
                                <label htmlFor="capacity" className="form-label">Capacity (people per session)</label>
                                <input
                                    type="number"
                                    id="capacity"
                                    name="capacity"
                                    className="form-control"
                                    value={formData.capacity}
                                    onChange={handleChange}
                                    placeholder="Max people per session (optional)"
                                    min="1"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h3 className="section-title">Images</h3>

                    <div
                        className="product-images-dropzone"
                        onClick={() => document.getElementById('imageUpload').click()}
                    >
                        <p className="text-center mb-0">Click to upload service images (or drag & drop)</p>
                        <input
                            type="file"
                            id="imageUpload"
                            onChange={handleImageChange}
                            multiple
                            accept="image/*"
                            style={{ display: 'none' }}
                        />
                    </div>

                    {formData.images.length > 0 && (
                        <div className="image-preview-container">
                            {formData.images.map((image, index) => (
                                <div key={index} className="image-preview-item">
                                    <img
                                        src={image.preview || image.url}
                                        alt={`Preview ${index}`}
                                    />
                                    <button
                                        type="button"
                                        className="image-remove-btn"
                                        onClick={() => removeImage(index)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="form-section">
                    <h3 className="section-title">Tags & Status</h3>

                    <div className="form-group">
                        <label htmlFor="tags" className="form-label">Tags</label>
                        <div className="tag-input-container">
                            <input
                                type="text"
                                id="tags"
                                className="tag-input"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                                placeholder="Type and press Enter to add tags"
                            />

                            {formData.tags.length > 0 && (
                                <div className="tags-container">
                                    {formData.tags.map((tag, index) => (
                                        <div key={index} className="tag-badge">
                                            {tag}
                                            <button
                                                type="button"
                                                className="tag-remove-btn"
                                                onClick={() => removeTag(tag)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-check form-switch">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id="isActive"
                            name="isActive"
                            checked={formData.isActive}
                            onChange={handleChange}
                        />
                        <label className="form-check-label" htmlFor="isActive">
                            Service is active and available for booking
                        </label>
                    </div>
                </div>

                <div className="form-buttons">
                    <button
                        type="button"
                        className="btn-outline-secondary"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn-primary"
                    >
                        {service ? 'Update Service' : 'Add Service'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ServiceManagement;
