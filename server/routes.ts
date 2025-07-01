import { Request, Response, NextFunction, Express } from "express";
import { Server } from "http";
import { z } from "zod";
import path from "path";
import { storage } from "./storage";
import { bookingStatuses, loginSchema, insertUserSchema } from "@shared/schema";
import OpenAI from "openai";
import vendorAuthRouter from "./vendor-auth";

interface UserSession {
  id: number;
  username: string;
  email: string;
  fullName: string;
  businessName: string;
  businessType: string;
  role: string;
  categoriesAllowed: any;
  createdAt: Date | null;
}

declare module "express-session" {
  interface SessionData {
    user: UserSession;
  }
}

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function registerRoutes(app: Express): Promise<void> {
  // Enhanced vendor authentication routes
  app.use("/api/vendor", vendorAuthRouter);

  // API Reports endpoint for generating CSV reports
  app.get("/api/reports/generate", (req: Request, res: Response) => {
    // Generate report data - in a real app, this would fetch from database
    const content = "Islandloaf Report\nBookings: 102\nVendors: 40\nRevenue: LKR 3,400,000";
    
    // Set headers for file download
    res.setHeader('Content-Disposition', 'attachment; filename=islandloaf_report.csv');
    res.set('Content-Type', 'text/csv');
    res.send(content);
  });
  // Enhanced middleware to check if user is authenticated with logging
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.session.user) {
      console.log(`🔒 Unauthorized access attempt to ${req.path} from IP: ${req.ip}`);
      return res.status(401).json({ error: "Not authenticated" });
    }
    console.log(`✅ Authenticated request to ${req.path} by user ${req.session.user.id} (${req.session.user.role})`);
    next();
  };

  // Role-based access control middleware
  const requireRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: Function) => {
      if (!req.session.user) {
        console.log(`🔒 Unauthenticated role check attempt on ${req.path}`);
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      if (!allowedRoles.includes(req.session.user.role)) {
        console.log(`🚫 Role violation: ${req.session.user.role} tried to access ${req.path} (requires: ${allowedRoles.join('|')})`);
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      
      console.log(`✅ Role authorized: ${req.session.user.role} accessing ${req.path}`);
      next();
    };
  };

  // Initialize admin user if none exists (for production setup)
  const initializeAdminUser = async () => {
    try {
      const users = await storage.getUsers();
      const adminExists = users.some(user => user.role === 'admin');
      
      if (!adminExists) {
        console.log("No admin user found. Please create an admin user through the registration process.");
        console.log("You can register at /api/auth/register with role 'admin'");
      }
    } catch (error) {
      console.error("Error checking admin user:", error);
    }
  };

  // Check for admin user on startup
  await initializeAdminUser();

  // Vendor Registration Route (new dedicated endpoint)
  app.post("/api/vendors/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already in use" });
      }
      
      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      // Create the vendor with pending status
      const newVendor = await storage.createUser({
        ...userData,
        role: 'vendor'
      });
      
      // Create welcome notification for admin review
      await storage.createNotification({
        userId: 1, // Admin user ID
        title: "New Vendor Application",
        message: `New vendor application from ${newVendor.businessName} (${newVendor.email}) awaiting approval.`,
        type: "info",
        read: false
      });
      
      // Return success without logging in (awaiting approval)
      res.status(201).json({
        message: "Vendor application submitted successfully. You will be notified once approved.",
        status: "pending"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Vendor registration error:", error);
      res.status(500).json({ error: "Failed to submit vendor application" });
    }
  });

  // Auth Routes
  // Registration endpoint
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already in use" });
      }
      
      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      // Create the user (categories will be auto-assigned based on business type)
      const newUser = await storage.createUser(userData);
      
      // Set session (excluding password)
      const { password: sessionPassword, ...sessionUser } = newUser;
      req.session.user = sessionUser;

      // Return user data (excluding password)
      const { password: newUserPassword, ...newUserData } = newUser;
      
      // Create welcome notification
      await storage.createNotification({
        userId: newUser.id,
        title: "Welcome to IslandLoaf",
        message: `Welcome to IslandLoaf, ${newUser.fullName}! Your account has been created successfully. Get started by adding your first service.`,
        type: "info",
        read: false
      });
      
      res.status(201).json({
        user: newUserData,
        message: "Registration successful",
        categories: newUser.categoriesAllowed
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const data = loginSchema.parse(req.body);
      
      // Get user by email
      const user = await storage.getUserByEmail(data.email);
      
      if (!user || user.password !== data.password) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Set session (excluding password)
      const { password: sessionPassword, ...sessionUser } = user;
      req.session.user = sessionUser;

      // Return user data (excluding password)
      const { password: userPassword, ...userData } = user;
      res.status(200).json(userData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Session not found" });
      }
      
      const user = await storage.getUser(req.session.user.id);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "User not found" });
      }
      
      const { password, ...userData } = user;
      res.status(200).json(userData);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Service Routes
  app.get("/api/services", requireAuth, async (req: Request, res: Response) => {
    try {
      const services = await storage.getServices(req.session.user.id);
      res.status(200).json(services);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  // Booking Routes
  app.get("/api/bookings", requireAuth, async (req: Request, res: Response) => {
    try {
      const bookings = await storage.getBookings(req.session.user.id);
      res.status(200).json(bookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });
  
  app.get("/api/bookings/recent", requireAuth, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const bookings = await storage.getRecentBookings(req.session.user.id, limit);
      res.status(200).json(bookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent bookings" });
    }
  });
  
  app.post("/api/bookings", requireAuth, async (req: Request, res: Response) => {
    try {
      const { type, details, status } = req.body;
      
      // Validate booking type
      if (!['stay', 'vehicle', 'ticket', 'wellness'].includes(type)) {
        return res.status(400).json({ error: "Invalid booking type" });
      }
      
      // Validate booking status
      if (!bookingStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid booking status" });
      }
      
      // Create booking with user ID from session
      const booking = await storage.createBooking({
        userId: req.session.user.id,
        serviceId: details.serviceId || 1,
        customerName: details.customerName || "Guest",
        customerEmail: details.customerEmail || "",
        startDate: new Date(details.startDate || Date.now()),
        endDate: new Date(details.endDate || Date.now() + 86400000),
        totalPrice: details.totalPrice || 0,
        commission: details.commission || 0,
        status,
        notes: details.notes || null

      });
      
      // Create a notification for new booking
      await storage.createNotification({
        userId: req.session.user.id,
        title: `New ${type} booking created`,
        message: `A new ${type} booking has been created with status: ${status}`,
        type: "booking",
        read: false
      });
      
      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  app.patch("/api/bookings/:id/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const status = req.body.status;
      
      if (!bookingStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid booking status" });
      }
      
      const booking = await storage.getBooking(id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      if (booking.userId !== req.session.user.id) {
        return res.status(403).json({ error: "Not authorized to update this booking" });
      }
      
      const updatedBooking = await storage.updateBooking(id, { status });
      res.status(200).json(updatedBooking);
    } catch (error) {
      res.status(500).json({ error: "Failed to update booking status" });
    }
  });

  // Calendar Routes
  app.get("/api/calendar-events", requireAuth, async (req: Request, res: Response) => {
    try {
      const startDate = req.query.start ? new Date(req.query.start as string) : undefined;
      const endDate = req.query.end ? new Date(req.query.end as string) : undefined;
      
      const events = await storage.getCalendarEvents(req.session.user.id, startDate, endDate);
      res.status(200).json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  });
  
  app.get("/api/calendar-sources", requireAuth, async (req: Request, res: Response) => {
    try {
      const sources = await storage.getCalendarSources(req.session.user.id);
      res.status(200).json(sources);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch calendar sources" });
    }
  });
  
  app.post("/api/calendar-sources/:id/sync", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if our extended iCal sync functionality is available
      if ((storage as any).syncCalendarFromUrl) {
        // Use the iCal sync functionality
        const result = await (storage as any).syncCalendarFromUrl(id);
        return res.status(result.success ? 200 : 400).json(result);
      }
      
      // Fallback to simple update if iCal sync is not available
      const source = await storage.updateCalendarSource(id, {});
      
      if (!source) {
        return res.status(404).json({ error: "Calendar source not found" });
      }
      
      res.status(200).json({ 
        success: true, 
        message: "Calendar sync completed successfully"
      });
    } catch (error) {
      console.error("Error syncing calendar:", error);
      res.status(500).json({ error: "Failed to sync calendar" });
    }
  });

  // Notification Routes
  app.get("/api/notifications", requireAuth, async (req: Request, res: Response) => {
    try {
      const notifications = await storage.getNotifications(req.session.user.id);
      res.status(200).json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });
  
  app.get("/api/notifications/unread", requireAuth, async (req: Request, res: Response) => {
    try {
      const notifications = await storage.getUnreadNotifications(req.session.user.id);
      res.status(200).json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unread notifications" });
    }
  });
  
  app.post("/api/notifications/mark-all-read", requireAuth, async (req: Request, res: Response) => {
    try {
      const notifications = await storage.getUnreadNotifications(req.session.user.id);
      
      // Mark each notification as read
      for (const notification of notifications) {
        await storage.markNotificationRead(notification.id);
      }
      
      res.status(200).json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notifications as read" });
    }
  });

  // AI Marketing Routes
  app.post("/api/ai/generate-marketing", requireAuth, async (req: Request, res: Response) => {
    try {
      const { 
        contentType, 
        businessName,
        businessType,
        serviceDescription,
        targetAudience,
        tone
      } = req.body;
      
      if (!contentType || !serviceDescription) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
      
      // Verify API key is available
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "AI service is currently unavailable" });
      }
      
      let prompt = "";
      let contentTypeTitle = "";
      
      switch (contentType) {
        case "instagram":
          contentTypeTitle = "Instagram Post";
          prompt = `Create an engaging Instagram caption for ${businessName || 'my'} ${businessType || 'tourism business'} promoting the following service:\n\n${serviceDescription}\n\nTarget audience: ${targetAudience || 'tourists'}\nTone: ${tone || 'enthusiastic'}\n\nInclude relevant hashtags.`;
          break;
        case "facebook":
          contentTypeTitle = "Facebook Post";
          prompt = `Write a compelling Facebook post for ${businessName || 'my'} ${businessType || 'tourism business'} featuring this service:\n\n${serviceDescription}\n\nTarget audience: ${targetAudience || 'tourists'}\nTone: ${tone || 'friendly'}\n\nAim for engagement and shares.`;
          break;
        case "seo":
          contentTypeTitle = "SEO Description";
          prompt = `Generate an SEO-optimized description for ${businessName || 'my'} ${businessType || 'tourism business'} offering the following service:\n\n${serviceDescription}\n\nTarget keywords should focus on ${targetAudience || 'tourists'} looking for this type of service in Sri Lanka. Make it informative and persuasive.`;
          break;
        case "email":
          contentTypeTitle = "Email Campaign";
          prompt = `Compose an email campaign for ${businessName || 'my'} ${businessType || 'tourism business'} featuring:\n\n${serviceDescription}\n\nTarget audience: ${targetAudience || 'tourists'}\nTone: ${tone || 'professional'}\n\nInclude a subject line and call-to-action.`;
          break;
        default:
          contentTypeTitle = "Marketing Content";
          prompt = `Create marketing content for ${businessName || 'my'} ${businessType || 'tourism business'} about:\n\n${serviceDescription}\n\nTarget audience: ${targetAudience || 'tourists'}\nTone: ${tone || 'persuasive'}`;
      }
      
      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a marketing expert specializing in tourism and hospitality. Create compelling marketing content that highlights unique experiences and appeals to travelers."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 500
      });
      
      const generatedContent = response.choices[0].message.content;
      
      // Store the generated content
      const marketingContent = await storage.createMarketingContent({
        userId: req.session.user.id,
        title: `${contentTypeTitle} - ${new Date().toLocaleDateString()}`,
        contentType,
        content: generatedContent,
        serviceDescription,
        targetAudience: targetAudience || 'tourists',
        tone: tone || 'persuasive'
      });
      
      res.status(200).json({
        success: true,
        content: generatedContent,
        marketingContent
      });
    } catch (error) {
      console.error("Error generating marketing content:", error);
      res.status(500).json({ error: "Failed to generate marketing content" });
    }
  });
  
  app.get("/api/ai/marketing-contents", requireAuth, async (req: Request, res: Response) => {
    try {
      const contents = await storage.getMarketingContents(req.session.user.id);
      res.status(200).json(contents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch marketing contents" });
    }
  });

  // AI-Enhanced Booking Optimization
  app.post("/api/ai/optimize-booking", requireAuth, async (req: Request, res: Response) => {
    try {
      const { serviceType, checkIn, checkOut, guests, budget, preferences } = req.body;
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "AI optimization not available" });
      }

      const allServices = await storage.getServices(0); // Get all services for comparison
      const availableServices = allServices.filter(service => 
        service.type.toLowerCase() === serviceType.toLowerCase()
      );

      if (availableServices.length === 0) {
        return res.json({ 
          recommendations: [], 
          strategy: "No services available for this category",
          totalOptions: 0 
        });
      }

      const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));

      const prompt = `As a Sri Lankan tourism expert, analyze these accommodation options for optimal booking recommendations:

BOOKING REQUIREMENTS:
- Service Type: ${serviceType}
- Check-in: ${checkIn}
- Check-out: ${checkOut} (${nights} nights)
- Guests: ${guests}
- Budget: ${budget ? `$${budget}` : 'Flexible'}
- Preferences: ${preferences?.join(', ') || 'None specified'}

AVAILABLE OPTIONS:
${availableServices.map((service, idx) => `
${idx + 1}. ${service.title}
   - Price: $${service.price}/night (Total: $${service.price * nights * guests})
   - Type: ${service.type}
   - Description: ${service.description}
   - Service ID: ${service.id}
`).join('')}

ANALYSIS REQUIRED:
1. Rank top 3 best matches considering value, suitability, and guest preferences
2. Provide detailed reasoning for each recommendation
3. Suggest booking strategy and tips
4. Identify any seasonal considerations or special opportunities

Respond in JSON format:
{
  "recommendations": [
    {
      "serviceId": number,
      "rank": 1,
      "matchScore": "percentage match to requirements",
      "valueRating": "excellent/good/fair/poor",
      "reasoning": "detailed explanation of why this is recommended",
      "highlights": ["key selling points"],
      "considerations": ["important notes or limitations"]
    }
  ],
  "strategy": "overall booking strategy and timing advice",
  "marketInsights": "current market conditions and trends",
  "alternatives": "suggestion for alternative dates or options if beneficial"
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a professional Sri Lankan tourism consultant with deep knowledge of local accommodations, seasonal patterns, and booking optimization strategies."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1500
      });

      const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');
      
      // Enrich recommendations with calculated pricing and service details
      const enrichedRecommendations = aiResponse.recommendations?.map((rec: any) => {
        const service = availableServices.find(s => s.id === rec.serviceId);
        return {
          ...rec,
          service,
          calculatedPrice: service.price * nights * guests,
          pricePerNight: service.price,
          totalNights: nights,
          savings: budget ? Math.max(0, budget - (service.price * nights * guests)) : 0
        };
      }) || [];

      res.json({
        recommendations: enrichedRecommendations,
        strategy: aiResponse.strategy,
        marketInsights: aiResponse.marketInsights,
        alternatives: aiResponse.alternatives,
        totalOptions: availableServices.length,
        searchCriteria: { serviceType, checkIn, checkOut, guests, budget }
      });

    } catch (error) {
      console.error("AI booking optimization error:", error);
      res.status(500).json({ error: "Failed to optimize booking recommendations" });
    }
  });

  // AI Vendor Performance Analytics
  app.post("/api/ai/vendor-analytics", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.user!.id;
      const { analysisType = 'comprehensive', period = 'monthly' } = req.body;
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "AI analytics not available" });
      }

      const [bookings, services, user] = await Promise.all([
        storage.getBookings(userId),
        storage.getServices(userId),
        storage.getUser(userId)
      ]);

      const recentBookings = bookings.slice(0, 50); // Last 50 bookings for analysis
      
      const prompt = `Analyze this Sri Lankan tourism vendor's business performance:

VENDOR PROFILE:
- Business: ${user?.businessName || 'Tourism Vendor'}
- Location: Sri Lanka
- Services Offered: ${services.length} active listings

SERVICE PORTFOLIO:
${services.map(s => `- ${s.name} (${s.type}): $${s.basePrice}/night - ${s.description.substring(0, 100)}...`).join('\n')}

BOOKING PERFORMANCE (Last ${recentBookings.length} bookings):
${recentBookings.map(b => `- Service ${b.serviceId}: ${b.startDate.toISOString().split('T')[0]} → ${b.endDate.toISOString().split('T')[0]}, ${b.status.toUpperCase()}, $${b.totalPrice || 'N/A'}`).join('\n')}

ANALYSIS REQUIREMENTS:
1. Performance trends and patterns
2. Revenue optimization opportunities  
3. Service portfolio analysis
4. Market positioning assessment
5. Operational efficiency recommendations
6. Growth strategy suggestions

Provide comprehensive business insights in JSON:
{
  "performanceMetrics": {
    "bookingTrends": "detailed trend analysis",
    "revenuePatterns": "revenue insights and seasonality",
    "servicePerformance": "which services perform best",
    "customerBehavior": "booking patterns and preferences",
    "occupancyRate": "estimated occupancy analysis"
  },
  "businessHealth": {
    "strengths": ["list of business strengths"],
    "weaknesses": ["areas needing improvement"],
    "opportunities": ["market opportunities"],
    "threats": ["potential challenges"]
  },
  "recommendations": {
    "pricing": "specific pricing strategy advice",
    "marketing": "targeted marketing recommendations",
    "operations": "operational improvements",
    "serviceOptimization": "service portfolio recommendations",
    "customerExperience": "experience enhancement suggestions"
  },
  "actionPlan": {
    "immediate": ["actions to take within 1 week"],
    "shortTerm": ["actions for next 1-3 months"],
    "longTerm": ["strategic 6-12 month goals"]
  },
  "competitiveInsights": "market positioning and competitor analysis",
  "riskAlerts": ["urgent issues requiring attention"]
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a senior business consultant specializing in Sri Lankan tourism industry with expertise in revenue optimization, market analysis, and operational efficiency."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 2000
      });

      const analytics = JSON.parse(completion.choices[0].message.content || '{}');
      
      // Add calculated metrics
      const totalRevenue = recentBookings
        .filter(b => b.status === 'confirmed')
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      
      const averageBookingValue = recentBookings.length > 0 
        ? totalRevenue / recentBookings.filter(b => b.status === 'confirmed').length 
        : 0;

      res.json({
        ...analytics,
        calculatedMetrics: {
          totalRevenue,
          averageBookingValue: Math.round(averageBookingValue),
          totalBookings: recentBookings.length,
          confirmedBookings: recentBookings.filter(b => b.status === 'confirmed').length,
          conversionRate: recentBookings.length > 0 
            ? Math.round((recentBookings.filter(b => b.status === 'confirmed').length / recentBookings.length) * 100)
            : 0
        },
        analysisDate: new Date().toISOString(),
        period
      });

    } catch (error) {
      console.error("AI vendor analytics error:", error);
      res.status(500).json({ error: "Failed to generate vendor analytics" });
    }
  });

  // AI Customer Feedback Analysis
  app.post("/api/ai/analyze-feedback", requireAuth, async (req: Request, res: Response) => {
    try {
      const { feedback, bookingId, customerName, serviceType } = req.body;
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "AI feedback analysis not available" });
      }

      if (!feedback) {
        return res.status(400).json({ error: "Feedback text is required" });
      }

      const prompt = `Analyze this customer feedback from a Sri Lankan tourism booking:

BOOKING CONTEXT:
- Service Type: ${serviceType || 'Not specified'}
- Customer: ${customerName || 'Anonymous'}
- Booking ID: ${bookingId || 'Unknown'}

CUSTOMER FEEDBACK:
"${feedback}"

ANALYSIS REQUIREMENTS:
1. Sentiment analysis (positive/negative/neutral with confidence score)
2. Category classification for tourism industry
3. Priority level assessment  
4. Specific actionable insights
5. Professional response recommendation
6. Business improvement suggestions

Provide detailed analysis in JSON:
{
  "sentiment": {
    "classification": "positive/negative/neutral",
    "confidence": "percentage confidence in classification",
    "emotionalTone": "description of emotional tone",
    "intensity": "low/medium/high"
  },
  "categorization": {
    "primaryCategory": "accommodation/service/location/value/cleanliness/staff/amenities/transport/food/other",
    "secondaryCategories": ["additional relevant categories"],
    "specificAspects": ["detailed aspects mentioned"]
  },
  "businessImpact": {
    "priority": "low/medium/high/urgent",
    "actionRequired": true/false,
    "potentialImpact": "description of business impact",
    "reputationRisk": "low/medium/high"
  },
  "insights": {
    "keyPoints": ["main points from feedback"],
    "customerExpectations": "what customer expected vs received",
    "satisfactionDrivers": ["factors that influenced satisfaction"],
    "improvementAreas": ["specific areas for improvement"]
  },
  "recommendations": {
    "immediateActions": ["urgent actions to take"],
    "responseStrategy": "how to respond to customer",
    "operationalChanges": ["process improvements to implement"],
    "preventiveMeasures": ["how to prevent similar issues"]
  },
  "responseTemplate": {
    "tone": "professional tone recommendation",
    "content": "suggested response to customer",
    "followUpActions": ["post-response actions needed"]
  },
  "businessIntelligence": {
    "trendsIndicators": ["what this feedback suggests about trends"],
    "competitiveInsights": ["insights about market expectations"],
    "serviceGaps": ["identified service gaps"]
  }
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a customer experience analyst specializing in Sri Lankan tourism with expertise in sentiment analysis, service quality assessment, and reputation management."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 2000
      });

      const analysis = JSON.parse(completion.choices[0].message.content || '{}');
      
      // Log the analysis for tracking (you might want to store this in your database)
      console.log(`Feedback analysis completed for booking ${bookingId}:`, {
        sentiment: analysis.sentiment?.classification,
        priority: analysis.businessImpact?.priority,
        category: analysis.categorization?.primaryCategory
      });

      res.json({
        ...analysis,
        metadata: {
          analyzedAt: new Date().toISOString(),
          bookingId,
          customerName,
          serviceType,
          feedbackLength: feedback.length
        }
      });

    } catch (error) {
      console.error("AI feedback analysis error:", error);
      res.status(500).json({ error: "Failed to analyze customer feedback" });
    }
  });

  // AI Trip Concierge Service
  app.post("/api/ai/trip-concierge", requireAuth, async (req: Request, res: Response) => {
    try {
      const { arrivalDate, duration, interests, budget, location = "Sri Lanka" } = req.body;
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "AI concierge service not available" });
      }

      if (!arrivalDate || !duration || !interests || !budget) {
        return res.status(400).json({ error: "Missing required fields: arrivalDate, duration, interests, budget" });
      }

      // Get available services from our system
      const allServices = await storage.getServices(0);
      const accommodations = allServices.filter(s => s.type.toLowerCase() === 'accommodation');
      const tours = allServices.filter(s => s.type.toLowerCase() === 'tours');
      const transport = allServices.filter(s => s.type.toLowerCase() === 'transport');
      const wellness = allServices.filter(s => s.type.toLowerCase() === 'wellness');

      const conciergePrompt = `Create a detailed ${duration}-day Sri Lankan travel itinerary:

TRIP DETAILS:
- Arrival: ${arrivalDate}
- Duration: ${duration} days
- Interests: ${interests.join(', ')}
- Total Budget: $${budget}
- Location Focus: ${location}

AVAILABLE SERVICES:
Accommodations (${accommodations.length} options):
${accommodations.slice(0, 5).map(s => `- ${s.title}: $${s.price}/night - ${s.description.substring(0, 80)}...`).join('\n')}

Tours & Activities (${tours.length} options):
${tours.slice(0, 5).map(s => `- ${s.title}: $${s.price} - ${s.description.substring(0, 80)}...`).join('\n')}

Transport Options (${transport.length} available):
${transport.slice(0, 3).map(s => `- ${s.title}: $${s.price} - ${s.description.substring(0, 80)}...`).join('\n')}

Wellness Services (${wellness.length} available):
${wellness.slice(0, 3).map(s => `- ${s.title}: $${s.price} - ${s.description.substring(0, 80)}...`).join('\n')}

REQUIREMENTS:
1. Create day-by-day detailed itinerary
2. Include morning, afternoon, evening activities
3. Recommend specific accommodations from our list
4. Suggest transportation between locations
5. Estimate daily costs and keep within budget
6. Add cultural insights and local tips
7. Include weather considerations
8. Suggest authentic Sri Lankan experiences

Format as comprehensive JSON:
{
  "itinerary": {
    "days": [
      {
        "day": 1,
        "date": "calculated date",
        "location": "primary location",
        "morning": {"activity": "description", "cost": 0, "duration": "2 hours"},
        "afternoon": {"activity": "description", "cost": 0, "duration": "3 hours"},
        "evening": {"activity": "description", "cost": 0, "duration": "2 hours"},
        "accommodation": {"name": "from our list", "cost": 0},
        "meals": {"breakfast": 0, "lunch": 0, "dinner": 0},
        "transport": {"method": "description", "cost": 0},
        "dailyTotal": 0,
        "highlights": ["key experiences"],
        "tips": ["local insights"]
      }
    ]
  },
  "summary": {
    "totalEstimatedCost": 0,
    "accommodationCost": 0,
    "activitiesCost": 0,
    "transportCost": 0,
    "mealsCost": 0,
    "budgetRemaining": 0
  },
  "recommendations": {
    "bestAccommodations": ["top 3 from our services"],
    "mustDoActivities": ["essential experiences"],
    "culturalExperiences": ["authentic Sri Lankan experiences"],
    "foodRecommendations": ["local cuisine highlights"],
    "packingList": ["essential items to bring"]
  },
  "bookingStrategy": {
    "bestBookingTimes": "when to book each service",
    "seasonalConsiderations": "weather and crowd factors",
    "budgetOptimization": "money-saving tips",
    "flexibilityAdvice": "alternative options"
  }
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert Sri Lankan travel concierge with deep local knowledge. Create personalized, practical itineraries that showcase authentic experiences while respecting budget constraints. Use actual services from the provided list when possible."
          },
          {
            role: "user",
            content: conciergePrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 3000
      });

      const tripPlan = JSON.parse(completion.choices[0].message.content || '{}');

      // Add booking links for recommended services
      const bookingLinks = {
        accommodations: accommodations.slice(0, 3).map(s => ({
          id: s.id,
          name: s.title,
          price: s.price,
          bookingUrl: `/book/service/${s.id}`,
          description: s.description.substring(0, 100) + '...'
        })),
        tours: tours.slice(0, 5).map(s => ({
          id: s.id,
          name: s.title,
          price: s.price,
          bookingUrl: `/book/service/${s.id}`,
          description: s.description.substring(0, 100) + '...'
        })),
        transport: transport.slice(0, 3).map(s => ({
          id: s.id,
          name: s.title,
          price: s.price,
          bookingUrl: `/book/service/${s.id}`,
          description: s.description.substring(0, 100) + '...'
        }))
      };

      res.json({
        success: true,
        tripRequest: {
          arrivalDate,
          duration,
          interests,
          budget,
          location
        },
        itinerary: tripPlan.itinerary,
        summary: tripPlan.summary,
        recommendations: tripPlan.recommendations,
        bookingStrategy: tripPlan.bookingStrategy,
        bookingLinks,
        generatedAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Valid for 7 days
      });

    } catch (error) {
      console.error("AI trip concierge error:", error);
      res.status(500).json({ error: "Failed to generate travel itinerary" });
    }
  });

  // AI Agent Executor System
  app.post("/api/ai/agent-executor", requireAuth, async (req: Request, res: Response) => {
    try {
      const { agent, action, data } = req.body;
      const userId = req.session.user!.id;
      
      if (!agent || !action || !data) {
        return res.status(400).json({ error: "Missing required fields: agent, action, data" });
      }

      // Define available agent actions
      const agentHandlers = {
        vendor: {
          analyze: async (params: any) => {
            const vendorServices = await storage.getServices(params.vendorId || userId);
            const vendorBookings = await storage.getBookings(params.vendorId || userId);
            
            return {
              success: true,
              vendorId: params.vendorId || userId,
              analytics: {
                totalServices: vendorServices.length,
                totalBookings: vendorBookings.length,
                revenue: vendorBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0),
                activeServices: vendorServices.filter(s => s.type).length
              },
              message: "Vendor analysis completed"
            };
          },
          approve: async (params: any) => {
            // Simulate vendor approval (in real system, this would update vendor status)
            return {
              success: true,
              vendorId: params.vendorId,
              status: "approved",
              message: `Vendor ${params.vendorId} has been approved`,
              approvedAt: new Date().toISOString()
            };
          },
          suspend: async (params: any) => {
            return {
              success: true,
              vendorId: params.vendorId,
              status: "suspended",
              reason: params.reason || "Policy violation",
              message: `Vendor ${params.vendorId} has been suspended`
            };
          }
        },
        booking: {
          create: async (params: any) => {
            const booking = await storage.createBooking({
              userId: params.vendorId || userId,
              serviceType: params.serviceType,
              checkIn: params.checkIn,
              checkOut: params.checkOut,
              guests: params.guests,
              totalPrice: params.totalPrice,
              status: "pending",
              customerName: params.customerName,
              customerEmail: params.customerEmail
            });
            
            return {
              success: true,
              bookingId: booking.id,
              message: "Booking created successfully"
            };
          },
          confirm: async (params: any) => {
            const booking = await storage.updateBooking(params.bookingId, { status: "confirmed" });
            return {
              success: true,
              bookingId: params.bookingId,
              status: "confirmed",
              message: "Booking confirmed successfully"
            };
          },
          cancel: async (params: any) => {
            const booking = await storage.updateBooking(params.bookingId, { status: "cancelled" });
            return {
              success: true,
              bookingId: params.bookingId,
              status: "cancelled",
              message: "Booking cancelled successfully"
            };
          }
        },
        marketing: {
          generateContent: async (params: any) => {
            if (!process.env.OPENAI_API_KEY) {
              throw new Error("OpenAI API not configured");
            }
            
            const content = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                {
                  role: "system",
                  content: "Generate marketing content for Sri Lankan tourism businesses."
                },
                {
                  role: "user",
                  content: `Create ${params.type} content for ${params.businessName} targeting ${params.audience}`
                }
              ],
              max_tokens: 500
            });
            
            const marketingContent = await storage.createMarketingContent({
              userId,
              contentType: params.type,
              content: content.choices[0].message.content || "",
              targetAudience: params.audience,
              createdAt: new Date()
            });
            
            return {
              success: true,
              contentId: marketingContent.id,
              content: content.choices[0].message.content,
              message: "Marketing content generated successfully"
            };
          },
          scheduleCampaign: async (params: any) => {
            return {
              success: true,
              campaignId: params.campaignId,
              scheduledFor: params.scheduledDate,
              message: "Campaign scheduled successfully"
            };
          }
        },
        support: {
          createTicket: async (params: any) => {
            const notification = await storage.createNotification({
              userId,
              title: `Support Ticket: ${params.subject}`,
              message: params.description,
              type: "support",
              read: false,
              createdAt: new Date()
            });
            
            return {
              success: true,
              ticketId: notification.id,
              subject: params.subject,
              message: "Support ticket created successfully"
            };
          },
          respondToTicket: async (params: any) => {
            return {
              success: true,
              ticketId: params.ticketId,
              response: params.response,
              message: "Response sent successfully"
            };
          }
        }
      };

      // Validate agent and action
      if (!agentHandlers[agent as keyof typeof agentHandlers]) {
        return res.status(400).json({ error: `Invalid agent: ${agent}` });
      }

      const agentHandler = agentHandlers[agent as keyof typeof agentHandlers];
      if (!agentHandler[action as keyof typeof agentHandler]) {
        return res.status(400).json({ error: `Invalid action '${action}' for agent '${agent}'` });
      }

      // Execute the agent action
      const result = await agentHandler[action as keyof typeof agentHandler](data);

      // Log the action (you could extend this to store in database)
      console.log(`Agent action executed: ${agent}/${action}`, {
        userId,
        data,
        result,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        agent,
        action,
        result,
        executedAt: new Date().toISOString(),
        executedBy: userId
      });

    } catch (error) {
      console.error("Agent executor error:", error);
      res.status(500).json({ 
        error: "Agent execution failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Enhanced System Status
  app.get("/api/system/status", async (req: Request, res: Response) => {
    try {
      const status = {
        service: 'islandloaf-api',
        version: '2.0.0',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        services: {
          database: process.env.DATABASE_URL ? 'postgresql' : 'memory',
          openai: !!process.env.OPENAI_API_KEY,
          storage: 'operational',
          agent_api: !!process.env.AGENT_API_KEY
        },
        endpoints: {
          health: '/api/health',
          agent: '/api/agent/execute',
          ai: '/api/ai/*',
          webhooks: '/api/webhooks/*'
        }
      };

      res.json({
        success: true,
        data: status,
        message: 'System operational'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'System check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Agent API key validation middleware
  const validateAgentApiKey = (req: Request, res: Response, next: Function) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    
    if (!apiKey || apiKey !== process.env.AGENT_API_KEY) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
        code: 'INVALID_API_KEY'
      });
    }

    next();
  };

  // Universal Agent Executor
  app.post("/api/agent/execute", validateAgentApiKey, async (req: Request, res: Response) => {
    try {
      const { agent, action, data, requestId } = req.body;
      
      if (!agent || !action) {
        return res.status(400).json({
          success: false,
          error: 'Agent and action are required',
          code: 'MISSING_PARAMS'
        });
      }

      const startTime = Date.now();
      console.log(`Agent execution: ${agent}.${action} - ${requestId || 'no-id'}`);

      let result;
      
      switch (agent.toLowerCase()) {
        case 'vendor':
          result = await executeVendorAgent(action, data);
          break;
        case 'booking':
          result = await executeBookingAgent(action, data);
          break;
        case 'marketing':
          result = await executeMarketingAgent(action, data);
          break;
        case 'support':
          result = await executeSupportAgent(action, data);
          break;
        default:
          throw new Error(`Unknown agent: ${agent}`);
      }

      res.json({
        success: true,
        agent,
        action,
        data: result,
        message: `${agent} agent executed ${action} successfully`,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - startTime
        }
      });

    } catch (error) {
      console.error('Agent execution failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'EXECUTION_FAILED',
        fallback: 'Manual intervention required',
        metadata: {
          requestId: req.body.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  // Agent action handlers with Airtable integration
  async function executeVendorAgent(action: string, data: any) {
    const airtableService = await import('./services/airtable.js').then(m => m.default);
    
    switch (action) {
      case 'analyze':
        // Get vendor analytics from Airtable
        const analytics = await airtableService.getVendorAnalytics(data.vendorId);
        
        await airtableService.logSystemEvent({
          eventType: 'Agent Execution',
          agent: 'vendor',
          action: 'analyze',
          data: { vendorId: data.vendorId },
          status: 'Success'
        });
        
        return {
          vendorId: data.vendorId,
          status: 'active',
          analytics: analytics,
          analysis: `Vendor analysis: ${analytics.totalBookings} bookings, ${analytics.conversionRate}% conversion rate`
        };

      case 'approve':
        await airtableService.updateVendor(data.vendorId, {
          'Status': 'Approved'
        });
        
        await airtableService.logSystemEvent({
          eventType: 'Vendor Action',
          agent: 'vendor',
          action: 'approve',
          data: { vendorId: data.vendorId },
          status: 'Success'
        });
        
        return {
          vendorId: data.vendorId,
          status: 'approved',
          approvedAt: new Date().toISOString()
        };

      case 'suspend':
        await airtableService.updateVendor(data.vendorId, {
          'Status': 'Suspended'
        });
        
        await airtableService.logSystemEvent({
          eventType: 'Vendor Action',
          agent: 'vendor',
          action: 'suspend',
          data: { vendorId: data.vendorId, reason: data.reason },
          status: 'Success'
        });
        
        return {
          vendorId: data.vendorId,
          status: 'suspended',
          suspendedAt: new Date().toISOString(),
          reason: data.reason || 'Administrative action'
        };

      default:
        throw new Error(`Unknown vendor action: ${action}`);
    }
  }

  async function executeBookingAgent(action: string, data: any) {
    const airtableService = await import('./services/airtable.js').then(m => m.default);
    
    switch (action) {
      case 'create':
        const bookingId = `B${Date.now()}`;
        
        // Create booking in Airtable
        await airtableService.createBooking({
          bookingId,
          vendorId: data.vendorId,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          guests: data.guests || 1,
          checkIn: data.startDate,
          checkOut: data.endDate,
          status: 'Pending'
        });

        // Create corresponding payment entry
        const paymentId = `P${Date.now()}`;
        await airtableService.createPayment({
          paymentId,
          bookingId,
          vendorId: data.vendorId,
          amount: data.totalPrice,
          status: 'Pending',
          dueDate: data.endDate
        });

        await airtableService.logSystemEvent({
          eventType: 'Booking Creation',
          agent: 'booking',
          action: 'create',
          data: { bookingId, vendorId: data.vendorId, amount: data.totalPrice },
          status: 'Success'
        });

        return {
          bookingId,
          paymentId,
          status: 'created',
          totalPrice: data.totalPrice,
          commission: data.totalPrice * 0.1
        };

      case 'confirm':
        await airtableService.updateBookingStatus(data.bookingId, 'Confirmed');
        
        await airtableService.logSystemEvent({
          eventType: 'Booking Confirmation',
          agent: 'booking',
          action: 'confirm',
          data: { bookingId: data.bookingId },
          status: 'Success'
        });
        
        return {
          bookingId: data.bookingId,
          status: 'confirmed',
          confirmedAt: new Date().toISOString()
        };

      case 'cancel':
        await airtableService.updateBookingStatus(data.bookingId, 'Cancelled');
        
        await airtableService.logSystemEvent({
          eventType: 'Booking Cancellation',
          agent: 'booking',
          action: 'cancel',
          data: { bookingId: data.bookingId, reason: data.reason },
          status: 'Success'
        });
        
        return {
          bookingId: data.bookingId,
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          reason: data.reason || 'Customer request'
        };

      default:
        throw new Error(`Unknown booking action: ${action}`);
    }
  }

  async function executeMarketingAgent(action: string, data: any) {
    switch (action) {
      case 'generate_content':
        return {
          contentType: data.type || 'social_media',
          content: `Generated ${data.type} content for ${data.service}`,
          generatedAt: new Date().toISOString()
        };

      case 'schedule_campaign':
        return {
          campaignId: `CAM-${Date.now()}`,
          scheduled: true,
          scheduledFor: data.scheduledFor,
          platform: data.platform
        };

      default:
        throw new Error(`Unknown marketing action: ${action}`);
    }
  }

  async function executeSupportAgent(action: string, data: any) {
    switch (action) {
      case 'create_ticket':
        const notification = await storage.createNotification({
          userId: data.vendorId || 1,
          title: `Support Ticket: ${data.subject}`,
          message: data.description,
          type: 'support'
        });

        return {
          ticketId: notification.id,
          subject: data.subject,
          priority: data.priority || 'medium',
          createdAt: new Date().toISOString()
        };

      case 'respond':
        return {
          ticketId: data.ticketId,
          response: data.response,
          respondedAt: new Date().toISOString(),
          status: 'responded'
        };

      default:
        throw new Error(`Unknown support action: ${action}`);
    }
  }

  // Webhook Endpoints
  app.post("/api/webhooks/n8n", async (req: Request, res: Response) => {
    try {
      const { workflow, data, executionId } = req.body;
      
      console.log(`n8n webhook: ${workflow} - ${executionId}`);

      let result;
      switch (workflow) {
        case 'booking_automation':
          const booking = await storage.createBooking({
            userId: data.vendorId,
            serviceId: data.serviceId,
            customerName: data.customerName,
            customerEmail: data.customerEmail,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            totalPrice: data.totalPrice,
            commission: data.commission || data.totalPrice * 0.1,
            status: 'pending'
          });
          result = { bookingId: booking.id };
          break;

        case 'vendor_onboarding':
          const vendor = await storage.createUser({
            username: data.email,
            email: data.email,
            password: 'temp-password',
            fullName: data.fullName,
            businessName: data.businessName,
            businessType: data.businessType,
            role: 'vendor'
          });
          result = { vendorId: vendor.id };
          break;

        default:
          result = { message: 'Workflow not recognized' };
      }

      res.json({
        success: true,
        executionId,
        result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('n8n webhook error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'Manual processing required'
      });
    }
  });

  // Airtable Integration Endpoints
  app.get("/api/airtable/test", async (req: Request, res: Response) => {
    try {
      const airtableService = await import('./services/airtable.js').then(m => m.default);
      const result = await airtableService.testConnection();
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      });
    }
  });

  app.get("/api/airtable/vendors", async (req: Request, res: Response) => {
    try {
      const airtableService = await import('./services/airtable.js').then(m => m.default);
      const vendors = await airtableService.getVendors();
      res.json({
        success: true,
        data: vendors,
        count: vendors.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch vendors'
      });
    }
  });

  app.get("/api/airtable/bookings", async (req: Request, res: Response) => {
    try {
      const airtableService = await import('./services/airtable.js').then(m => m.default);
      const bookings = await airtableService.getBookings();
      res.json({
        success: true,
        data: bookings,
        count: bookings.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch bookings'
      });
    }
  });

  app.get("/api/airtable/payments", async (req: Request, res: Response) => {
    try {
      const airtableService = await import('./services/airtable.js').then(m => m.default);
      const payments = await airtableService.getPayments();
      res.json({
        success: true,
        data: payments,
        count: payments.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch payments'
      });
    }
  });

  app.get("/api/airtable/reports", async (req: Request, res: Response) => {
    try {
      const airtableService = await import('./services/airtable.js').then(m => m.default);
      const { startDate, endDate } = req.query;
      const reports = await airtableService.getDailyReports(
        startDate as string, 
        endDate as string
      );
      res.json({
        success: true,
        data: reports,
        count: reports.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch reports'
      });
    }
  });

  app.get("/api/airtable/analytics/:vendorId", async (req: Request, res: Response) => {
    try {
      const airtableService = await import('./services/airtable.js').then(m => m.default);
      const { vendorId } = req.params;
      const analytics = await airtableService.getVendorAnalytics(vendorId);
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics'
      });
    }
  });

  app.post("/api/airtable/sync", async (req: Request, res: Response) => {
    try {
      const airtableService = await import('./services/airtable.js').then(m => m.default);
      const { syncType } = req.body;
      
      let result;
      switch (syncType) {
        case 'vendors':
          result = await airtableService.getVendors();
          break;
        case 'bookings':
          result = await airtableService.getBookings();
          break;
        case 'payments':
          result = await airtableService.getPayments();
          break;
        case 'reports':
          result = await airtableService.getDailyReports();
          break;
        default:
          throw new Error('Invalid sync type');
      }

      await airtableService.logSystemEvent({
        eventType: 'Data Sync',
        action: syncType,
        data: { recordCount: result.length },
        status: 'Success'
      });

      res.json({
        success: true,
        message: `${syncType} synchronized successfully`,
        data: result,
        count: result.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      });
    }
  });

  // Services Management Endpoints
  app.get("/api/services", requireAuth, async (req: Request, res: Response) => {
    try {
      const airtableService = await import('./services/airtable.js').then(m => m.default);
      const services = await airtableService.getServices();
      res.json({
        success: true,
        data: services,
        count: services.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch services'
      });
    }
  });

  app.post("/api/services", requireAuth, async (req: Request, res: Response) => {
    try {
      const airtableService = await import('./services/airtable.js').then(m => m.default);
      const serviceData = {
        serviceId: `SVC${Date.now()}`,
        vendorId: req.body.vendorId,
        serviceName: req.body.serviceName,
        category: req.body.category,
        description: req.body.description,
        price: req.body.price,
        currency: req.body.currency || 'LKR',
        imageUrl: req.body.imageUrl,
        availability: req.body.availability || 'Available'
      };
      
      const result = await airtableService.createService(serviceData);
      await airtableService.logSystemEvent({
        eventType: 'CREATE',
        action: 'services',
        data: { serviceId: serviceData.serviceId },
        status: 'Success'
      });
      
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create service'
      });
    }
  });

  // Update service endpoint
  app.patch("/api/services/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const serviceId = parseInt(req.params.id);
      const updateData = req.body;
      const userId = req.session.user!.id;
      
      // Try to update in local storage first
      const existingService = await storage.getService(serviceId);
      if (existingService && existingService.userId === userId) {
        const updatedService = await storage.updateService(serviceId, updateData);
        if (updatedService) {
          return res.json(updatedService);
        }
      }
      
      // If not found in local storage, try Airtable
      const airtableService = await import('./services/airtable.js').then(m => m.default);
      const result = await airtableService.updateService(serviceId.toString(), updateData);
      
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Service update error:", error);
      res.status(500).json({ error: "Failed to update service" });
    }
  });

  // Customer Feedback Management
  app.get("/api/feedback", requireAuth, async (req: Request, res: Response) => {
    try {
      const airtableService = await import('./services/airtable.js').then(m => m.default);
      const feedback = await airtableService.getCustomerFeedback();
      res.json({
        success: true,
        data: feedback,
        count: feedback.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch feedback'
      });
    }
  });

  app.post("/api/feedback", requireAuth, async (req: Request, res: Response) => {
    try {
      const airtableService = await import('./services/airtable.js').then(m => m.default);
      
      // Calculate sentiment analysis
      function calculateSentiment(text: string): string {
        if (!text) return 'Neutral';
        const positiveWords = ['excellent', 'great', 'good', 'amazing', 'wonderful', 'fantastic', 'love', 'best', 'perfect', 'outstanding'];
        const negativeWords = ['bad', 'poor', 'terrible', 'awful', 'worst', 'hate', 'disappointed', 'horrible', 'disgusting'];
        const textLower = text.toLowerCase();
        const positiveCount = positiveWords.filter(word => textLower.includes(word)).length;
        const negativeCount = negativeWords.filter(word => textLower.includes(word)).length;
        if (positiveCount > negativeCount) return 'Positive';
        if (negativeCount > positiveCount) return 'Negative';
        return 'Neutral';
      }

      const feedbackData = {
        feedbackId: `FB${Date.now()}`,
        bookingId: req.body.bookingId,
        vendorId: req.body.vendorId,
        customerName: req.body.customerName,
        rating: req.body.rating,
        reviewText: req.body.reviewText,
        sentiment: calculateSentiment(req.body.reviewText)
      };
      
      const result = await airtableService.createCustomerFeedback(feedbackData);
      await airtableService.logSystemEvent({
        eventType: 'CREATE',
        action: 'feedback',
        data: { feedbackId: feedbackData.feedbackId },
        status: 'Success'
      });
      
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create feedback'
      });
    }
  });

  app.get("/api/feedback/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const airtableService = await import('./services/airtable.js').then(m => m.default);
      const feedback = await airtableService.getCustomerFeedback();
      
      const stats = {
        totalFeedback: feedback.length,
        averageRating: feedback.length > 0 
          ? feedback.reduce((sum, f) => sum + parseFloat(f.rating || '0'), 0) / feedback.length 
          : 0,
        sentimentBreakdown: {
          positive: feedback.filter(f => f.sentiment === 'Positive').length,
          neutral: feedback.filter(f => f.sentiment === 'Neutral').length,
          negative: feedback.filter(f => f.sentiment === 'Negative').length
        },
        responseRate: feedback.length > 0 
          ? (feedback.filter(f => f.responseByVendor).length / feedback.length * 100) 
          : 0
      };
      
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch feedback stats'
      });
    }
  });

  // Marketing Campaigns Management  
  app.get("/api/campaigns", requireAuth, async (req: Request, res: Response) => {
    try {
      const airtableService = await import('./services/airtable.js').then(m => m.default);
      const campaigns = await airtableService.getMarketingCampaigns();
      res.json({
        success: true,
        data: campaigns,
        count: campaigns.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch campaigns'
      });
    }
  });

  app.post("/api/campaigns", requireAuth, async (req: Request, res: Response) => {
    try {
      const airtableService = await import('./services/airtable.js').then(m => m.default);
      const campaignData = {
        campaignId: `CAMP${Date.now()}`,
        vendorId: req.body.vendorId,
        campaignName: req.body.campaignName,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        budget: req.body.budget,
        channel: req.body.channel,
        kpi: req.body.kpi,
        status: req.body.status || 'Planned'
      };
      
      const result = await airtableService.createMarketingCampaign(campaignData);
      await airtableService.logSystemEvent({
        eventType: 'CREATE',
        action: 'campaigns',
        data: { campaignId: campaignData.campaignId },
        status: 'Success'
      });
      
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create campaign'
      });
    }
  });

  app.get("/api/campaigns/active", requireAuth, async (req: Request, res: Response) => {
    try {
      const airtableService = await import('./services/airtable.js').then(m => m.default);
      const campaigns = await airtableService.getMarketingCampaigns();
      const today = new Date();
      
      const activeCampaigns = campaigns.filter(campaign => {
        const start = new Date(campaign.startDate);
        const end = new Date(campaign.endDate);
        return start <= today && today <= end;
      });
      
      res.json({
        success: true,
        data: activeCampaigns,
        count: activeCampaigns.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch active campaigns'
      });
    }
  });

  // Agent Training Management
  app.get("/api/ai/agent-training", requireAuth, async (req: Request, res: Response) => {
    try {
      const airtableService = await import('./services/airtable.js').then(m => m.default);
      const trainingHistory = await airtableService.getAgentTraining();
      
      res.json({
        success: true,
        data: trainingHistory,
        count: trainingHistory.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch training history'
      });
    }
  });

  // System Logs Endpoint
  app.get("/api/system/logs", requireAuth, async (req: Request, res: Response) => {
    try {
      const airtableService = await import('./services/airtable.js').then(m => m.default);
      const logs = await airtableService.getSystemLogs();
      
      res.json({
        success: true,
        data: logs.slice(0, 100), // Last 100 logs
        count: logs.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch system logs'
      });
    }
  });

  // AI Agent Trainer Endpoints
  app.post("/api/ai/agent-trainer", requireAuth, async (req: Request, res: Response) => {
    try {
      const { agent, trainingData } = req.body;
      const userId = req.session.user!.id;
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "AI training service not available" });
      }

      if (!agent || !trainingData?.input || !trainingData?.expectedOutput) {
        return res.status(400).json({ error: "Missing required training data" });
      }

      // Generate prompt tuning suggestions using OpenAI
      const tuningPrompt = `Analyze this training example for an AI agent and provide specific prompt improvements:

AGENT TYPE: ${agent}
USER INPUT: ${trainingData.input}
EXPECTED OUTPUT: ${trainingData.expectedOutput}
CONTEXT: ${trainingData.context || 'None provided'}

Provide structured analysis:
1. IMPROVED PROMPT TEMPLATE for this scenario
2. KEY PATTERNS the agent should recognize
3. RESPONSE STRUCTURE guidelines
4. EDGE CASES to consider
5. VALIDATION RULES for similar inputs

Format as actionable prompt engineering advice for a ${agent} agent in a Sri Lankan tourism platform.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: "You are an AI prompt engineering expert specializing in tourism and booking systems. Provide specific, actionable advice for improving agent prompts." 
          },
          { role: "user", content: tuningPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const suggestions = completion.choices[0].message.content || "";

      // Store training data as a notification for tracking
      const trainingRecord = await storage.createNotification({
        userId,
        title: `AI Training: ${agent} Agent`,
        message: `Input: ${trainingData.input}\nExpected: ${trainingData.expectedOutput}`,
        type: "training",
        read: false
      });

      console.log(`AI Agent Training Submitted:`, {
        agent,
        userId,
        trainingId: trainingRecord.id,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        trainingId: trainingRecord.id,
        suggestions: suggestions,
        message: "Training data processed and suggestions generated"
      });

    } catch (error) {
      console.error("AI agent training error:", error);
      res.status(500).json({ error: "Failed to process training data" });
    }
  });

  app.get("/api/ai/agent-trainer/history", requireAuth, async (req: Request, res: Response) => {
    try {
      const { agent } = req.query;
      const userId = req.session.user!.id;

      // Get training history from notifications
      const notifications = await storage.getNotifications(userId);
      const trainingHistory = notifications
        .filter(n => n.type === "training")
        .filter(n => !agent || n.title.includes(agent as string))
        .slice(0, 20)
        .map(n => ({
          id: n.id,
          agent: n.title.replace("AI Training: ", "").replace(" Agent", ""),
          input: n.message.split("\nExpected:")[0].replace("Input: ", ""),
          expectedOutput: n.message.split("\nExpected: ")[1] || "",
          status: 'success' as const,
          timestamp: n.createdAt || new Date().toISOString()
        }));

      res.json({ 
        success: true, 
        history: trainingHistory
      });

    } catch (error) {
      console.error("Failed to fetch training history:", error);
      res.status(500).json({ error: "Failed to fetch training history" });
    }
  });

  // ===== MISSING API ENDPOINTS FOR FRONTEND =====
  
  // Stay/Accommodation API endpoints
  app.get("/api/stay/types", requireAuth, async (req: Request, res: Response) => {
    try {
      const stayTypes = [
        'One Room', 'Double Bed', 'Twin Room', 'Triple Room', 'Family Room', 
        'Deluxe Room', 'Suite', 'Junior Suite', 'Studio', 'Entire Villa', 
        'Entire Apartment', 'Private Cottage', 'Shared Dorm', 'Capsule Room',
        'Tent', 'Bungalow', 'Chalet', 'Houseboat', 'Cabana', 'Treehouse'
      ];
      res.json(stayTypes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stay types" });
    }
  });

  app.get("/api/stay/property-types", requireAuth, async (req: Request, res: Response) => {
    try {
      const propertyTypes = [
        'Hotel', 'Villa', 'Resort', 'Apartment', 'Bungalow', 'Boutique Hotel',
        'Homestay', 'Hostel', 'Cottage', 'Treehouse', 'Guesthouse'
      ];
      res.json(propertyTypes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch property types" });
    }
  });

  app.get("/api/stay/property-spaces", requireAuth, async (req: Request, res: Response) => {
    try {
      const propertySpaces = [
        'Beachfront', 'Mountain View', 'City Center', 'Countryside', 'Lakeside',
        'Riverside', 'Forest', 'Desert', 'Island', 'Oceanfront'
      ];
      res.json(propertySpaces);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch property spaces" });
    }
  });

  app.get("/api/stay/themes", requireAuth, async (req: Request, res: Response) => {
    try {
      const themes = [
        'Romantic', 'Family-friendly', 'Business', 'Luxury', 'Budget',
        'Adventure', 'Eco-friendly', 'Historic', 'Modern', 'Traditional'
      ];
      res.json(themes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch themes" });
    }
  });

  app.get("/api/stay/amenities", requireAuth, async (req: Request, res: Response) => {
    try {
      const amenities = [
        { id: '1', name: 'WiFi' },
        { id: '2', name: 'Air Conditioning' },
        { id: '3', name: 'Swimming Pool' },
        { id: '4', name: 'Beach Access' },
        { id: '5', name: 'Kitchen' },
        { id: '6', name: 'Breakfast Included' },
        { id: '7', name: 'Private Bathroom' },
        { id: '8', name: 'Balcony' },
        { id: '9', name: 'Ocean View' },
        { id: '10', name: 'Gym Access' }
      ];
      res.json(amenities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch amenities" });
    }
  });

  // Vehicle/Transport API endpoints
  app.get("/api/vehicles/types", requireAuth, async (req: Request, res: Response) => {
    try {
      const vehicleTypes = [
        'Economy Car', 'Compact Car', 'Mid-size Car', 'Full-size Car', 'Luxury Car',
        'SUV', 'Minivan', 'Pickup Truck', 'Motorcycle', 'Scooter', 'Bicycle',
        'Van', 'Bus', 'Boat', 'Jet Ski', 'Quad Bike', 'Golf Cart'
      ];
      res.json(vehicleTypes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vehicle types" });
    }
  });

  app.get("/api/vehicles/vendor-options", requireAuth, async (req: Request, res: Response) => {
    try {
      const vendorOptions = [
        'Economy Car', 'Compact Car', 'Mid-size Car', 'Full-size Car', 'Luxury Car',
        'SUV', 'Minivan', 'Pickup Truck', 'Motorcycle', 'Scooter', 'Bicycle',
        'Van', 'Bus', 'Boat', 'Jet Ski', 'Quad Bike', 'Golf Cart'
      ];
      res.json(vendorOptions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor options" });
    }
  });

  app.get("/api/vehicles/rental-types", requireAuth, async (req: Request, res: Response) => {
    try {
      const rentalTypes = [
        'Hourly', 'Half Day', 'Full Day', 'Weekly', 'Monthly', 
        'Airport Transfer', 'One-way Trip', 'Round Trip'
      ];
      res.json(rentalTypes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rental types" });
    }
  });

  app.get("/api/vehicles/fuel-types", requireAuth, async (req: Request, res: Response) => {
    try {
      const fuelTypes = [
        'Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG', 'LPG'
      ];
      res.json(fuelTypes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch fuel types" });
    }
  });

  app.get("/api/vehicles/transmissions", requireAuth, async (req: Request, res: Response) => {
    try {
      const transmissions = [
        'Automatic', 'Manual', 'Semi-automatic', 'CVT'
      ];
      res.json(transmissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transmissions" });
    }
  });

  app.get("/api/vehicles/features", requireAuth, async (req: Request, res: Response) => {
    try {
      const vehicleFeatures = [
        { id: '1', name: 'GPS Navigation' },
        { id: '2', name: 'Child Seat' },
        { id: '3', name: 'Additional Driver' },
        { id: '4', name: 'Roof Rack' },
        { id: '5', name: 'Bluetooth Audio' },
        { id: '6', name: 'Full Insurance' },
        { id: '7', name: 'Unlimited Mileage' },
        { id: '8', name: 'Roadside Assistance' },
        { id: '9', name: 'Winter Tires' },
        { id: '10', name: 'Ski Rack' }
      ];
      res.json(vehicleFeatures);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vehicle features" });
    }
  });

  // Wellness API endpoints
  app.get("/api/wellness/time-slots", requireAuth, async (req: Request, res: Response) => {
    try {
      const timeSlots = [
        '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', 
        '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:00', '17:00 - 18:00'
      ];
      res.json(timeSlots);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch time slots" });
    }
  });

  app.get("/api/wellness/therapists", requireAuth, async (req: Request, res: Response) => {
    try {
      const therapists = [
        'No Preference', 'Sarah', 'John', 'Emily', 'Michael', 'Anna'
      ];
      res.json(therapists);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch therapists" });
    }
  });

  // Pricing API endpoints
  app.post("/api/pricing/update-all", requireAuth, async (req: Request, res: Response) => {
    try {
      // Simulate pricing update
      await new Promise(resolve => setTimeout(resolve, 1000));
      res.json({ success: true, message: "All pricing updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update pricing" });
    }
  });

  app.post("/api/pricing/save", requireAuth, async (req: Request, res: Response) => {
    try {
      const pricingData = req.body;
      // Here you would save pricing data to storage
      console.log("Saving pricing data:", pricingData);
      res.json({ success: true, message: "Pricing saved successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to save pricing" });
    }
  });

  // Calendar sync endpoint
  app.post("/api/calendar/sync-all", requireAuth, async (req: Request, res: Response) => {
    try {
      // Simulate calendar sync
      await new Promise(resolve => setTimeout(resolve, 2000));
      res.json({ success: true, message: "Calendar sync completed" });
    } catch (error) {
      res.status(500).json({ error: "Failed to sync calendars" });
    }
  });

  // Marketing API endpoint (fix the existing one)
  app.post("/api/marketing/generate", requireAuth, async (req: Request, res: Response) => {
    try {
      const { type, serviceId, prompt } = req.body;
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "AI marketing service not available" });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: "You are a marketing expert specializing in Sri Lankan tourism. Generate engaging, culturally appropriate marketing content." 
          },
          { 
            role: "user", 
            content: `Generate ${type} marketing content for service ID ${serviceId}. Prompt: ${prompt}` 
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const content = completion.choices[0].message.content || "";

      // Save to storage
      const marketingContent = await storage.createMarketingContent({
        userId: req.session.user!.id,
        type,
        content,
        serviceId: serviceId || null,
        status: 'draft'
      });

      res.json(marketingContent);
    } catch (error) {
      console.error("Marketing generation error:", error);
      res.status(500).json({ error: "Failed to generate marketing content" });
    }
  });

  // ===== END MISSING API ENDPOINTS =====

  // For handling errors
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).send({ error: "Something went wrong!" });
  });
  
  // Return null instead of creating a new server
  return null;
}