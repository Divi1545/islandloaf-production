import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";

interface Booking {
  id: string;
  customerName: string;
  checkIn: string;
  checkOut: string;
  service: string;
  status: string;
  amount: number;
}

interface UpcomingBookingsProps {
  limit?: number;
}

const UpcomingBookings = ({ limit = 5 }: UpcomingBookingsProps) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUpcomingBookings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/bookings/upcoming', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('islandloaf_auth_token') ? JSON.parse(localStorage.getItem('islandloaf_auth_token')!).token : ''}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch upcoming bookings');
        }

        const data = await response.json();
        setBookings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load upcoming bookings');
        console.error('Upcoming bookings fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUpcomingBookings();
  }, []);
  
  // Get only the first 'limit' number of bookings
  const limitedBookings = bookings.slice(0, limit);
  
  // Format date as "May 20, 2025"
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error: {error}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No upcoming bookings found.
      </div>
    );
  }
  
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-medium text-sm">Booking ID</th>
              <th className="text-left py-3 px-4 font-medium text-sm">Guest</th>
              <th className="text-left py-3 px-4 font-medium text-sm">Check In</th>
              <th className="text-left py-3 px-4 font-medium text-sm">Check Out</th>
              <th className="text-left py-3 px-4 font-medium text-sm">Service</th>
              <th className="text-left py-3 px-4 font-medium text-sm">Status</th>
              <th className="text-right py-3 px-4 font-medium text-sm">Amount</th>
              <th className="text-right py-3 px-4 font-medium text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {limitedBookings.map((booking) => (
              <tr key={booking.id} className="border-b">
                <td className="py-4 px-4 text-sm">{booking.id}</td>
                <td className="py-4 px-4 text-sm font-medium">{booking.customerName}</td>
                <td className="py-4 px-4 text-sm">{formatDate(booking.checkIn)}</td>
                <td className="py-4 px-4 text-sm">{formatDate(booking.checkOut)}</td>
                <td className="py-4 px-4 text-sm">{booking.service}</td>
                <td className="py-4 px-4 text-sm">
                  <span 
                    className={`
                      inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                      ${booking.status === 'confirmed' 
                        ? 'bg-green-100 text-green-800' 
                        : booking.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                      }
                    `}
                  >
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </td>
                <td className="py-4 px-4 text-sm text-right">${booking.amount.toFixed(2)}</td>
                <td className="py-4 px-4 text-right">
                  <Button variant="ghost" size="sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {limit < bookings.length && (
        <div className="flex justify-center mt-6">
          <Button variant="outline">View All Bookings</Button>
        </div>
      )}
    </div>
  );
};

export default UpcomingBookings;