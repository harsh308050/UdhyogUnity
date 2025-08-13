// src/testData.js - Test data for debugging and development

// Sample business data structure
export const sampleBusinesses = [
    {
        id: "test-business-1@example.com",
        businessName: "Tech Solutions Hub",
        businessType: "Technology",
        description: "Professional IT solutions and consulting services for businesses",
        email: "test-business-1@example.com",
        phoneNumber: "+911234567890",
        address: {
            city: "Mumbai",
            state: "Maharashtra"
        },
        rating: 4.5,
        reviewCount: 25,
        isVerified: true,
        logo: {
            url: "https://via.placeholder.com/150/0066cc/white?text=TS",
            folder: "UdhyogUnity/TestBusiness1/Profile",
            public_id: "logo_tech_solutions"
        },
        createdAt: "2024-01-15T10:30:00Z"
    },
    {
        id: "test-business-2@example.com",
        businessName: "Green Garden Cafe",
        businessType: "Food & Dining",
        description: "Organic food and sustainable dining experience",
        email: "test-business-2@example.com",
        phoneNumber: "+911234567891",
        address: {
            city: "Pune",
            state: "Maharashtra"
        },
        rating: 4.2,
        reviewCount: 18,
        isVerified: true,
        logo: {
            url: "https://via.placeholder.com/150/228B22/white?text=GG",
            folder: "UdhyogUnity/TestBusiness2/Profile",
            public_id: "logo_green_garden"
        },
        createdAt: "2024-01-20T14:15:00Z"
    }
];

// Sample product data structure
export const sampleProducts = [
    {
        id: "product-1",
        productId: "product-1",
        name: "Wireless Bluetooth Headphones",
        description: "High-quality wireless headphones with noise cancellation",
        price: 2999,
        originalPrice: 3999,
        category: "Electronics",
        images: [
            {
                id: "img1",
                url: "https://via.placeholder.com/300x300/000000/white?text=Headphones",
                name: "Main Image"
            }
        ],
        businessName: "Tech Solutions Hub",
        businessEmail: "test-business-1@example.com",
        businessId: "tech_solutions_hub",
        inStock: true,
        rating: 4.3,
        reviewCount: 12,
        createdAt: "2024-01-25T09:00:00Z"
    },
    {
        id: "product-2",
        productId: "product-2",
        name: "Organic Green Tea",
        description: "Premium organic green tea leaves sourced from local farmers",
        price: 299,
        originalPrice: 399,
        category: "Food & Beverages",
        images: [
            {
                id: "img2",
                url: "https://via.placeholder.com/300x300/228B22/white?text=Green+Tea",
                name: "Main Image"
            }
        ],
        businessName: "Green Garden Cafe",
        businessEmail: "test-business-2@example.com",
        businessId: "green_garden_cafe",
        inStock: true,
        rating: 4.6,
        reviewCount: 8,
        createdAt: "2024-01-28T11:30:00Z"
    }
];

// Sample service data structure
export const sampleServices = [
    {
        id: "service-1",
        serviceId: "service-1",
        name: "Website Development",
        description: "Complete website development and deployment services",
        price: 15000,
        duration: 120, // minutes
        category: "Technology",
        images: [
            {
                id: "simg1",
                url: "https://via.placeholder.com/300x300/0066cc/white?text=Web+Dev",
                name: "Service Image"
            }
        ],
        businessName: "Tech Solutions Hub",
        businessEmail: "test-business-1@example.com",
        businessId: "tech_solutions_hub",
        isActive: true,
        rating: 4.7,
        reviewCount: 15,
        createdAt: "2024-01-22T13:45:00Z"
    },
    {
        id: "service-2",
        serviceId: "service-2",
        name: "Private Dining Experience",
        description: "Customized private dining with organic ingredients",
        price: 1200,
        duration: 180, // minutes
        category: "Food & Dining",
        images: [
            {
                id: "simg2",
                url: "https://via.placeholder.com/300x300/228B22/white?text=Dining",
                name: "Service Image"
            }
        ],
        businessName: "Green Garden Cafe",
        businessEmail: "test-business-2@example.com",
        businessId: "green_garden_cafe",
        isActive: true,
        rating: 4.5,
        reviewCount: 10,
        createdAt: "2024-01-26T16:20:00Z"
    }
];

// Function to add test data to Firebase (for debugging)
export const addTestDataToFirebase = async () => {
    console.log("Test data structure:", {
        businesses: sampleBusinesses.length,
        products: sampleProducts.length,
        services: sampleServices.length
    });

    // This would be used for adding test data if needed
    return {
        businesses: sampleBusinesses,
        products: sampleProducts,
        services: sampleServices
    };
};
