import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import axios from 'axios';
import dotenv from 'dotenv';
import FormData from 'form-data';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Trust proxy - Required for Render and other platforms behind reverse proxy
// This allows express-rate-limit to correctly identify users via X-Forwarded-For header
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://www.craftbg.click',
    'https://craftbg.click',
    process.env.FRONTEND_URL || '',
    /\.vercel\.app$/,
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many requests, please try again later.'
});

app.use('/api/', limiter);

// Multer setup
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

// Health check
app.get('/', (req: Request, res: Response) => {
  res.json({ status: 'OK' });
});

// Background removal endpoint - RapidAPI
app.post('/api/remove-bg', upload.single('file'), async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    if (!req.file) {
      console.error('❌ No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'background-removal4.p.rapidapi.com';

    if (!RAPIDAPI_KEY) {
      console.error('❌ RAPIDAPI_KEY not configured');
      return res.status(500).json({ error: 'API key not configured' });
    }

    console.log('📤 Processing image:', {
      filename: req.file.originalname,
      size: `${(req.file.size / 1024).toFixed(2)} KB`,
      mimetype: req.file.mimetype,
      timestamp: new Date().toISOString()
    });

    console.log('🔧 API Configuration:', {
      host: RAPIDAPI_HOST,
      endpoint: `https://${RAPIDAPI_HOST}/v1/results`,
      hasApiKey: !!RAPIDAPI_KEY,
      apiKeyPrefix: RAPIDAPI_KEY.substring(0, 10) + '...'
    });

    console.log('🔄 Calling RapidAPI...');

    // Create FormData and append the image file
    const formData = new FormData();
    formData.append('image', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    // Call RapidAPI Background Removal
    const apiResponse = await axios.post(
      `https://${RAPIDAPI_HOST}/v1/results`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': RAPIDAPI_HOST,
        },
        timeout: 60000, // 60 second timeout
        responseType: 'json',
      }
    );

    const processingTime = Date.now() - startTime;
    console.log(`✅ Success! Processing time: ${processingTime}ms`);

    // RapidAPI returns JSON with results array containing base64 image
    // Response format: { results: [{ entities: [{ image: "base64..." }] }] }
    const results = apiResponse.data.results;

    if (!results || !results[0] || !results[0].entities || !results[0].entities[0]) {
      console.error('❌ Invalid API response format');
      return res.status(500).json({ error: 'Invalid API response format' });
    }

    const base64Image = results[0].entities[0].image;

    // Decode base64 to buffer
    const imageBuffer = Buffer.from(base64Image, 'base64');

    // Return PNG image
    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', `attachment; filename=\"removed-bg-${Date.now()}.png\"`);
    res.send(imageBuffer);

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Error after ${processingTime}ms:`, error.message);

    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      console.error('📛 API Response Error:', {
        status,
        statusText: error.response.statusText,
        headers: error.response.headers,
        data: JSON.stringify(errorData)
      });

      // Handle specific error codes
      let errorMessage = 'Background removal failed';

      if (status === 400) {
        errorMessage = 'Invalid image format or corrupted file';
      } else if (status === 401 || status === 403) {
        errorMessage = 'API authentication error. Please check your API key';
        console.error('🔑 AUTHENTICATION ERROR - Check RAPIDAPI_KEY');
      } else if (status === 429) {
        errorMessage = 'API rate limit exceeded. Please try again later';
        console.error('⚠️ RATE LIMIT - RapidAPI quota exceeded');
      } else if (status === 500) {
        errorMessage = 'AI processing error. Please try again';
        console.error('🤖 AI API ERROR - RapidAPI internal error');
      } else if (status === 503) {
        errorMessage = 'Service temporarily unavailable. Please try again in a moment';
        console.error('⚠️ SERVICE UNAVAILABLE - RapidAPI may be down');
      }

      return res.status(status).json({
        error: errorMessage,
        details: errorData?.message || error.message
      });
    }

    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timeout after 60s');
      return res.status(504).json({
        error: 'Request timeout',
        message: 'The AI processing took too long. Please try with a smaller image.'
      });
    }

    if (error.code === 'ECONNREFUSED') {
      console.error('🔌 CONNECTION REFUSED - RapidAPI may be unreachable');
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Unable to connect to background removal service. Please try again later.'
      });
    }

    console.error('🔥 Unexpected error:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Image enhancement endpoint - RapidAPI AI Face Enhancer
app.post('/api/enhance-image', upload.single('file'), async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    if (!req.file) {
      console.error('❌ No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const ENHANCER_HOST = process.env.RAPIDAPI_HOST_ENHANCER || 'ai-face-enhancer.p.rapidapi.com';

    if (!RAPIDAPI_KEY) {
      console.error('❌ RAPIDAPI_KEY not configured');
      return res.status(500).json({ error: 'API key not configured' });
    }

    console.log('📤 Enhancing image:', {
      filename: req.file.originalname,
      size: `${(req.file.size / 1024).toFixed(2)} KB`,
      mimetype: req.file.mimetype,
      timestamp: new Date().toISOString()
    });

    console.log('🔧 API Configuration:', {
      host: ENHANCER_HOST,
      endpoint: `https://${ENHANCER_HOST}/face/editing/enhance-face`,
      hasApiKey: !!RAPIDAPI_KEY,
      apiKeyPrefix: RAPIDAPI_KEY.substring(0, 10) + '...'
    });

    console.log('🔄 Calling RapidAPI AI Face Enhancer...');

    // Create FormData and append the image file
    const formData = new FormData();
    formData.append('image', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    // Call RapidAPI AI Face Enhancer
    const apiResponse = await axios.post(
      `https://${ENHANCER_HOST}/face/editing/enhance-face`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': ENHANCER_HOST,
        },
        timeout: 120000, // 120 second timeout
        responseType: 'json',
      }
    );

    console.log('📥 API Response (full):', JSON.stringify(apiResponse.data, null, 2));

    console.log('📥 API Response:', {
      status_code: apiResponse.data.error_detail?.status_code,
      error_code: apiResponse.data.error_code,
      has_image_url: !!(apiResponse.data.data?.image_url)
    });

    // Check for errors in response
    if (apiResponse.data.error_code !== 0) {
      console.error('❌ API returned error:', apiResponse.data.error_detail?.message);
      return res.status(500).json({
        error: 'Image enhancement failed',
        details: apiResponse.data.error_detail?.message
      });
    }

    // Get the enhanced image URL from response (nested in data.data)
    const enhancedImageUrl = apiResponse.data.data?.image_url;
    if (!enhancedImageUrl) {
      console.error('❌ No image URL in response');
      return res.status(500).json({ error: 'No enhanced image URL returned' });
    }

    console.log('🔄 Downloading enhanced image from:', enhancedImageUrl);

    // Download the enhanced image
    const imageResponse = await axios.get(enhancedImageUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ Success! Processing time: ${processingTime}ms`);

    // Return enhanced image
    res.set('Content-Type', 'image/jpeg');
    res.set('Content-Disposition', `attachment; filename=\"enhanced-${Date.now()}.jpg\"`);
    res.send(imageResponse.data);

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Error after ${processingTime}ms:`, error.message);

    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      console.error('📛 API Response Error:', {
        status,
        statusText: error.response.statusText,
        headers: error.response.headers,
      });

      // Handle specific error codes
      let errorMessage = 'Image enhancement failed';

      if (status === 400) {
        errorMessage = 'Invalid image format or corrupted file';
      } else if (status === 401 || status === 403) {
        errorMessage = 'API authentication error. Please check your API key';
        console.error('🔑 AUTHENTICATION ERROR - Check RAPIDAPI_KEY');
      } else if (status === 429) {
        errorMessage = 'API rate limit exceeded. Please try again later';
        console.error('⚠️ RATE LIMIT - RapidAPI quota exceeded');
      } else if (status === 500) {
        errorMessage = 'AI processing error. Please try again';
        console.error('🤖 AI API ERROR - RapidAPI internal error');
      } else if (status === 503) {
        errorMessage = 'Service temporarily unavailable. Please try again in a moment';
        console.error('⚠️ SERVICE UNAVAILABLE - RapidAPI may be down');
      }

      return res.status(status).json({
        error: errorMessage,
        details: errorData?.message || error.message
      });
    }

    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timeout after 60s');
      return res.status(504).json({
        error: 'Request timeout',
        message: 'The AI processing took too long. Please try with a smaller image.'
      });
    }

    if (error.code === 'ECONNREFUSED') {
      console.error('🔌 CONNECTION REFUSED - RapidAPI may be unreachable');
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Unable to connect to image enhancement service. Please try again later.'
      });
    }

    console.error('🔥 Unexpected error:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/`);
  console.log(`📍 API endpoint: http://localhost:${PORT}/api/remove-bg`);
  console.log(`📍 API endpoint: http://localhost:${PORT}/api/enhance-image`);
});
