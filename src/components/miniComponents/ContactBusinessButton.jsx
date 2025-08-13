import React from 'react';
import { MessageSquare } from 'react-feather';
import { useAuth } from '../../context/AuthContext';
import { startConversationWithBusiness } from '../../Firebase/messageDb';
import { WindowDash } from 'react-bootstrap-icons';

/**
 * ContactBusinessButton - A reusable component to start conversations with businesses
 * 
 * Usage:
 * <ContactBusinessButton 
 *   businessEmail="business@example.com"
 *   businessName="Business Name"
 *   initialMessage="Hello! I'm interested in your services"
 *   onSuccess={() => console.log('Conversation started!')}
 *   onError={(error) => console.error('Error:', error)}
 * />
 */
function ContactBusinessButton({
    businessEmail,
    businessName = 'Business',
    initialMessage = '',
    onSuccess,
    onError,
    buttonText = '',
    className = '',
    style = {}
}) {
    const { currentUser } = useAuth();
    const [loading, setLoading] = React.useState(false);

    const handleStartConversation = async () => {
        if (!currentUser) {
            alert('Please login to start a conversation');
            return;
        }

        if (!businessEmail) {
            console.error('Business email is required');
            return;
        }

        setLoading(true);
        try {
            console.log('🚀 Starting conversation with:', businessEmail);

            await startConversationWithBusiness(
                currentUser.email,
                businessEmail,
                initialMessage,
                businessName
            );

            console.log('✅ Conversation started successfully');

            // Small delay to ensure Firebase has processed the write
            setTimeout(() => {
                if (onSuccess) {
                    onSuccess();
                } else {
                    alert(`Conversation started with ${businessName}! Check your messages.`);
                }
            }, 1000);

        } catch (error) {
            console.error('❌ Error starting conversation:', error);

            if (onError) {
                onError(error);
            } else {
                alert('Failed to start conversation. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };


    return (
        <button
            className={`btn-message ${className}`}
            onClick={handleStartConversation}
            disabled={loading || !currentUser}
            title={!currentUser ? 'Please login to contact business' : `Start conversation with ${businessName}`}
        >
            <MessageSquare size={16} />
            {loading ? '...' : buttonText}
        </button>
    );
}

export default ContactBusinessButton;
