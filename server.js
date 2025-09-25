const express = require('express');
const paypal = require('@paypal/checkout-server-sdk');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// PayPal SDK Configuration
const environment = process.env.PAYPAL_MODE === 'sandbox' 
  ? new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
  : new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);

const client = new paypal.core.PayPalHttpClient(environment);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Create order endpoint with your specific payload
app.post('/create-venmo-order', async (req, res) => {
  try {
    console.log('Creating Venmo order with custom payload...');
    
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    
    // Your exact payload structure
    request.requestBody({
      "intent": "AUTHORIZE",
      "payment_source": {
        "venmo": {
          "experience_context": {
            "return_url": "https://commercehub-checkout-nonprod.fiservapps.com/hpp/index.html?environment=QA&nonce=1d9e32cf-c24d-4b31-9e5a-f9c027ffa1ba&pageId=92b69cfc-20dc-410d-92c5-92d3848cb606&pageVersion=1&merchantId=CHPAYPAL001&terminalId=10000001&apiKey=d0WrInIXOyUIcV1tzyUUNqvPArDmtRjogWJNtYBCh6ZgrG9s&accessToken=meLHjhBYyjj87ztmqZJdXRKjrfd8&domain=pjs2demo.firstdata.com",
            "cancel_url": "https://commercehub-checkout-nonprod.fiservapps.com/hpp/index.html?environment=QA&nonce=1d9e32cf-c24d-4b31-9e5a-f9c027ffa1ba&pageId=92b69cfc-20dc-410d-92c5-92d3848cb606&pageVersion=1&merchantId=CHPAYPAL001&terminalId=10000001&apiKey=d0WrInIXOyUIcV1tzyUUNqvPArDmtRjogWJNtYBCh6ZgrG9s&accessToken=meLHjhBYyjj87ztmqZJdXRKjrfd8&domain=pjs2demo.firstdata.com",
            "user_action": "PAY_NOW"
          }
        }
      },
      "purchase_units": [
        {
          "amount": {
            "value": "71.0",
            "currency_code": "USD"
          },
          "payee": {
            "merchant_id": "YFNHY4ABW7XYG"
          },
          "shipping": {
            "name": {
              "full_name": "fed ex"
            },
            "address": {
              "address_line_1": "fedex",
              "admin_area_1": "CA",
              "admin_area_2": "San Francisco",
              "country_code": "US",
              "postal_code": "94107"
            },
            "phone": {
              "national_number": "4841231234"
            }
          }
        }
      ]
    });

    const order = await client.execute(request);
    
    console.log('Order created successfully:', order.result.id);
    console.log('Order status:', order.result.status);
    
    res.json({ 
      orderID: order.result.id,
      status: order.result.status,
      links: order.result.links
    });
    
  } catch (error) {
    console.error('❌ Error creating Venmo order:');
    console.error('Message:', error.message);
    console.error('Details:', error.details);
    console.error('Status Code:', error.statusCode);
    
    res.status(500).json({ 
      error: 'Failed to create order',
      message: error.message,
      details: error.details || 'No additional details',
      statusCode: error.statusCode || 500
    });
  }
});

// Authorize payment endpoint (since using AUTHORIZE intent)
app.post('/authorize-payment', async (req, res) => {
  try {
    const { orderID } = req.body;
    console.log('Authorizing payment for order:', orderID);
    
    const request = new paypal.orders.OrdersAuthorizeRequest(orderID);
    request.requestBody({});
    
    const authorize = await client.execute(request);
    
    console.log('Payment authorized successfully');
    console.log('Authorization ID:', authorize.result.purchase_units[0].payments.authorizations[0].id);
    
    res.json({ 
      success: true, 
      authorizationID: authorize.result.purchase_units[0].payments.authorizations[0].id,
      status: authorize.result.status,
      orderID: orderID
    });
    
  } catch (error) {
    console.error('❌ Error authorizing payment:', error.message);
    res.status(500).json({ 
      error: 'Failed to authorize payment',
      message: error.message 
    });
  }
});

// Optional: Capture authorized payment
app.post('/capture-authorization', async (req, res) => {
  try {
    const { authorizationID } = req.body;
    console.log('Capturing authorization:', authorizationID);
    
    const request = new paypal.payments.AuthorizationsCaptureRequest(authorizationID);
    request.requestBody({});
    
    const capture = await client.execute(request);
    
    res.json({
      success: true,
      captureID: capture.result.id,
      status: capture.result.status
    });
    
  } catch (error) {
    console.error('❌ Error capturing payment:', error.message);
    res.status(500).json({ 
      error: 'Failed to capture payment',
      message: error.message 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Visit: http://localhost:${PORT}`);
  console.log(`💳 PayPal Mode: ${process.env.PAYPAL_MODE || 'sandbox'}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
});