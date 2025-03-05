import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, CreditCard, Shield, ArrowRight, Check, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';
import { sendToTelegram } from '@/lib/tracking';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

interface CheckoutStep {
  id: 'cart' | 'auth' | 'payment' | 'confirmation';
  title: string;
  description: string;
}

const steps: CheckoutStep[] = [
  {
    id: 'cart',
    title: 'Review Cart',
    description: 'Review your selected items'
  },
  {
    id: 'auth',
    title: 'Authentication',
    description: 'Sign in to continue'
  },
  {
    id: 'payment',
    title: 'Payment',
    description: 'Choose payment method'
  },
  {
    id: 'confirmation',
    title: 'Confirmation',
    description: 'Complete your order'
  }
];

async function sendOrderConfirmationEmail(orderDetails: {
  orderNumber: string;
  email: string;
  items: any[];
  total: number;
}) {
  const { orderNumber, email, items, total } = orderDetails;
  
  console.log(`
    To: ${email}
    Subject: Order Confirmation #${orderNumber}
    
    Thank you for your order!
    
    Order Details:
    Order Number: ${orderNumber}
    Total Amount: $${total}
    
    Items:
    ${items.map(item => `- ${item.name}: $${item.price}`).join('\n')}
    
    Please contact us on Telegram for payment instructions.
    https://t.me/QuycanSoftware
  `);
}

export function CartPage() {
  const { user, signIn } = useAuth();
  const { items: cartItems, removeItem, clearCart } = useCart();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<'cart' | 'auth' | 'payment' | 'confirmation'>('cart');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const totalAmount = cartItems.reduce((sum, item) => sum + item.price, 0);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await signIn(email, password);
      setCurrentStep('payment');
    } catch (error: any) {
      // Error messages are handled by the auth hook
    }
  };

  const handleNextStep = async () => {
    if (currentStep === 'cart') {
      if (!user) {
        setCurrentStep('auth');
      } else {
        setCurrentStep('payment');
      }
    } else if (currentStep === 'payment') {
      setIsProcessing(true);
      const newOrderNumber = uuidv4().substring(0, 8).toUpperCase();
      setOrderNumber(newOrderNumber);

      // Send order details to Telegram
      const orderDetails = `
🛍️ <b>New Order #${newOrderNumber}</b>
⏰ <b>Order Time:</b> ${new Date().toLocaleString()}

👤 <b>Customer Information:</b>
• Email: ${user?.email}
• Name: ${user?.displayName || 'N/A'}

🛒 <b>Order Items:</b>
${cartItems.map(item => `• ${item.name} - $${item.price}`).join('\n')}

💰 <b>Total Amount:</b> $${totalAmount}

📱 <b>Contact:</b> Customer will contact via Telegram for payment
`;

      await sendToTelegram(orderDetails);

      // Send confirmation email
      await sendOrderConfirmationEmail({
        orderNumber: newOrderNumber,
        email: user?.email || '',
        items: cartItems,
        total: totalAmount
      });

      // Simulate payment processing
      setTimeout(() => {
        setIsProcessing(false);
        setCurrentStep('confirmation');
        toast.success('Order confirmation email sent!');
      }, 1500);
    } else if (currentStep === 'confirmation') {
      // Clear cart and redirect to Telegram
      clearCart();
      window.location.href = 'https://t.me/QuycanSoftware';
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'cart':
        return (
          <div className="space-y-8">
            {cartItems.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-600">Your cart is empty</p>
                <Button className="mt-4" asChild>
                  <Link to="/services">Browse Services</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-lg shadow-md p-6">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-4 border-b">
                      <div>
                        <h3 className="text-lg font-semibold">{item.name}</h3>
                        <p className="text-gray-600">{item.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">${item.price}/mo</p>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between mb-4">
                    <span className="text-lg">Total:</span>
                    <span className="text-lg font-bold">
                      ${totalAmount}/mo
                    </span>
                  </div>
                  <Button onClick={handleNextStep} className="w-full">
                    Proceed to Checkout
                  </Button>
                </div>
              </>
            )}
          </div>
        );

      case 'auth':
        return (
          <div className="bg-white rounded-lg shadow-md p-8">
            <Shield className="h-16 w-16 text-primary-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4 text-center">Sign in to Continue</h2>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label htmlFor="email" className="sr-only">Email address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Email address"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Password"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-blue-600 hover:text-blue-500">
                Sign up
              </Link>
            </p>
          </div>
        );

      case 'payment':
        return (
          <div className="bg-white rounded-lg shadow-md p-8">
            <CreditCard className="h-16 w-16 text-primary-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4 text-center">Payment Details</h2>
            
            <div className="space-y-6 max-w-md mx-auto">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Order Summary</h3>
                <div className="space-y-2">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span>${item.price}/mo</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>${totalAmount}/mo</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleNextStep}
                className="w-full"
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Complete Order'}
              </Button>
            </div>
          </div>
        );

      case 'confirmation':
        return (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Order Confirmed!</h2>
            <p className="text-gray-600 mb-2">
              Your order number is: <span className="font-bold">{orderNumber}</span>
            </p>
            <p className="text-gray-600 mb-6">
              A confirmation email has been sent to your email address.
              Click the button below to proceed with payment via Telegram.
            </p>
            <Button onClick={handleNextStep} className="w-full max-w-sm">
              Continue to Telegram <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex-1 ${index !== steps.length - 1 ? 'relative' : ''}`}
              >
                <div className="text-center">
                  <div
                    className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                      steps.findIndex(s => s.id === currentStep) >= index
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="mt-2">
                    <div className="text-sm font-medium">{step.title}</div>
                    <div className="text-xs text-gray-500">{step.description}</div>
                  </div>
                </div>
                {index !== steps.length - 1 && (
                  <div
                    className={`absolute top-4 w-full h-0.5 ${
                      steps.findIndex(s => s.id === currentStep) > index
                        ? 'bg-blue-600'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        {renderStepContent()}
      </div>
    </div>
  );
}