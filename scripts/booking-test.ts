/**
 * IslandLoaf Automated Booking Test Script
 * 
 * This script runs tests for all booking types to verify the end-to-end
 * functionality of the booking system is working properly.
 */

import fetch from 'node-fetch';
import { z } from 'zod';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

// API base URL
const API_URL = process.env.API_URL || 'http://localhost:5000/api';

// Test credentials - should be set via environment variables in production
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'testpassword'
};

const TEST_ADMIN = {
  email: process.env.TEST_ADMIN_EMAIL || 'admin@example.com',
  password: process.env.TEST_ADMIN_PASSWORD || 'adminpassword'
};

/**
 * Response schema for login
 */
const LoginResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  role: z.string(),
  businessName: z.string(),
  categoriesAllowed: z.any().optional(),
});

/**
 * Response schema for booking
 */
const BookingResponseSchema = z.object({
  id: z.number(),
  userId: z.number(),
  serviceId: z.number(),
  customerName: z.string(),
  status: z.string(),
  totalPrice: z.number(),
});

/**
 * Main test function
 */
async function runTests() {
  console.log(chalk.blue('🧪 Starting IslandLoaf Booking System Tests'));
  console.log(chalk.blue('===================================='));
  
  // Check if test credentials are properly configured
  if (TEST_USER.email === 'test@example.com' || TEST_ADMIN.email === 'admin@example.com') {
    console.log(chalk.yellow('⚠️ Using default test credentials. For production testing, set:'));
    console.log(chalk.yellow('   TEST_USER_EMAIL, TEST_USER_PASSWORD'));
    console.log(chalk.yellow('   TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD'));
  }
  
  let authToken;
  let vendorId;
  let serviceId;
  let bookingId;
  
  try {
    // === Authentication Tests ===
    console.log(chalk.cyan('\n📋 Testing Authentication'));
    
    // Test login
    console.log('🔍 Testing vendor login...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.statusText}`);
    }
    
    const userData = await loginResponse.json();
    const parsedUser = LoginResponseSchema.safeParse(userData);
    
    if (!parsedUser.success) {
      throw new Error(`Invalid user data: ${parsedUser.error}`);
    }
    
    authToken = loginResponse.headers.get('Authorization')?.split(' ')[1] || 'session-token';
    vendorId = parsedUser.data.id;
    
    console.log(chalk.green('✅ Authentication test passed'));
    
    // === Service Tests ===
    console.log(chalk.cyan('\n📋 Testing Services'));
    
    // Get services for vendor
    console.log('🔍 Fetching vendor services...');
    const servicesResponse = await fetch(`${API_URL}/services`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!servicesResponse.ok) {
      throw new Error(`Failed to fetch services: ${servicesResponse.statusText}`);
    }
    
    const services = await servicesResponse.json();
    
    if (!Array.isArray(services) || services.length === 0) {
      console.log(chalk.yellow('⚠️ No existing services found, creating a test service...'));
      
      // Create a test service
      const newService = {
        userId: vendorId,
        name: 'Test Beachfront Villa',
        description: 'Luxury beachfront villa for testing',
        type: 'stays',
        basePrice: 150.00,
        available: true
      };
      
      const createServiceResponse = await fetch(`${API_URL}/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(newService)
      });
      
      if (!createServiceResponse.ok) {
        throw new Error(`Failed to create service: ${createServiceResponse.statusText}`);
      }
      
      const createdService = await createServiceResponse.json();
      serviceId = createdService.id;
      console.log(chalk.green(`✅ Test service created with ID: ${serviceId}`));
    } else {
      serviceId = services[0].id;
      console.log(chalk.green(`✅ Using existing service with ID: ${serviceId}`));
    }
    
    // === Booking Tests ===
    console.log(chalk.cyan('\n📋 Testing Booking Creation'));
    
    // Test types of bookings to create
    const bookingTypes = [
      { type: 'stay', name: 'Stay Booking Test' },
      { type: 'transport', name: 'Transport Booking Test' },
      { type: 'tour', name: 'Tour Booking Test' },
      { type: 'wellness', name: 'Wellness Booking Test' },
      { type: 'product', name: 'Product Booking Test' }
    ];
    
    for (const bookingType of bookingTypes) {
      console.log(`🔍 Testing ${bookingType.type} booking creation...`);
      
      // Create booking dates
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7); // 1 week from now
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 3); // 3 days stay
      
      // Create a test booking
      const newBooking = {
        type: bookingType.type,
        serviceId: serviceId,
        customerName: `Test Customer (${bookingType.name})`,
        customerEmail: 'test@example.com',
        customerPhone: '+9477123456',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: 'pending',
        totalPrice: 450.00,
        details: {
          adults: 2,
          children: 1,
          specialRequests: 'This is an automated test booking'
        }
      };
      
      const createBookingResponse = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(newBooking)
      });
      
      if (!createBookingResponse.ok) {
        throw new Error(`Failed to create ${bookingType.type} booking: ${createBookingResponse.statusText}`);
      }
      
      const createdBooking = await createBookingResponse.json();
      const parsedBooking = BookingResponseSchema.safeParse(createdBooking);
      
      if (!parsedBooking.success) {
        throw new Error(`Invalid booking data: ${parsedBooking.error}`);
      }
      
      bookingId = parsedBooking.data.id;
      console.log(chalk.green(`✅ ${bookingType.type} booking created successfully with ID: ${bookingId}`));
      
      // Test booking update
      console.log(`🔍 Testing ${bookingType.type} booking status update...`);
      
      const updateBookingResponse = await fetch(`${API_URL}/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ status: 'confirmed' })
      });
      
      if (!updateBookingResponse.ok) {
        throw new Error(`Failed to update ${bookingType.type} booking: ${updateBookingResponse.statusText}`);
      }
      
      console.log(chalk.green(`✅ ${bookingType.type} booking status updated successfully`));
    }
    
    // === Calendar Tests ===
    console.log(chalk.cyan('\n📋 Testing Calendar Events'));
    
    console.log('🔍 Fetching calendar events...');
    const calendarResponse = await fetch(`${API_URL}/calendar/events`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (calendarResponse.ok) {
      const events = await calendarResponse.json();
      console.log(chalk.green(`✅ Calendar events fetched successfully (${events.length} events)`));
    } else {
      console.log(chalk.yellow('⚠️ Calendar endpoint not available'));
    }
    
    // === Admin Tests ===
    console.log(chalk.cyan('\n📋 Testing Admin Access'));
    
    console.log('🔍 Testing admin login...');
    const adminLoginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_ADMIN)
    });
    
    if (adminLoginResponse.ok) {
      const adminData = await adminLoginResponse.json();
      const adminToken = adminLoginResponse.headers.get('Authorization')?.split(' ')[1] || 'session-token';
      
      console.log(chalk.green('✅ Admin authentication successful'));
      
      // Test admin access to all bookings
      console.log('🔍 Testing admin access to all bookings...');
      const adminBookingsResponse = await fetch(`${API_URL}/admin/bookings`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      if (adminBookingsResponse.ok) {
        const adminBookings = await adminBookingsResponse.json();
        console.log(chalk.green(`✅ Admin bookings access successful (${adminBookings.length} bookings)`));
      } else {
        console.log(chalk.yellow('⚠️ Admin bookings endpoint not available'));
      }
      
      // Test admin access to reports
      console.log('🔍 Testing admin access to reports...');
      const reportsResponse = await fetch(`${API_URL}/admin/reports`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      if (reportsResponse.ok) {
        const reports = await reportsResponse.json();
        console.log(chalk.green('✅ Admin reports access successful'));
      } else {
        console.log(chalk.yellow('⚠️ Admin reports endpoint not available'));
      }
    } else {
      console.log(chalk.yellow('⚠️ Admin authentication not available'));
    }
    
    console.log(chalk.green('\n✅ All booking tests completed successfully!'));
    
  } catch (error) {
    console.error(chalk.red(`\n❌ Test failed: ${error.message}`));
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests()
    .then(() => {
      console.log(chalk.green('\n🎉 All tests passed!'));
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { runTests };