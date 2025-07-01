import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Filter, Eye, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Booking {
  id: number;
  serviceId: number;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  startDate: string;
  endDate: string;
  status: string;
  totalPrice: number;
  type: string;
}

export default function BookingManager() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [bookingTab, setBookingTab] = useState("upcoming");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/bookings', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('islandloaf_auth_token') ? JSON.parse(localStorage.getItem('islandloaf_auth_token')!).token : ''}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch bookings');
        }

        const data = await response.json();
        setBookings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load bookings');
        console.error('Bookings fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "cancelled":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      case "completed":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };
  
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy");
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  // Filter bookings based on tab and search query
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (bookingTab === "upcoming") {
      return booking.status !== "completed" && booking.status !== "cancelled" && matchesSearch;
    } else if (bookingTab === "past") {
      return (booking.status === "completed" || booking.status === "cancelled") && matchesSearch;
    } else {
      return matchesSearch;
    }
  });

  if (isLoading) {
    return (
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Booking Manager</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 animate-pulse rounded-lg"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Booking Manager</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-red-500">
              Error: {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Booking Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search bookings by name, email, or service..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Calendar className="mr-2 h-4 w-4" />
                Date Range
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={() => navigate("/dashboard/add-booking")}
              >
                + New Booking
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="upcoming" onValueChange={setBookingTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="upcoming">Upcoming & Active</TabsTrigger>
              <TabsTrigger value="past">Past Bookings</TabsTrigger>
              <TabsTrigger value="all">All Bookings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upcoming" className="m-0">
              <BookingTable bookings={filteredBookings} />
            </TabsContent>
            
            <TabsContent value="past" className="m-0">
              <BookingTable bookings={filteredBookings} />
            </TabsContent>
            
            <TabsContent value="all" className="m-0">
              <BookingTable bookings={filteredBookings} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

interface BookingTableProps {
  bookings: Booking[];
}

function BookingTable({ bookings }: BookingTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "cancelled":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      case "completed":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };
  
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy");
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                No bookings found
              </TableCell>
            </TableRow>
          ) : (
            bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-medium">#{booking.id}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{booking.serviceName}</div>
                    <div className="text-sm text-gray-500 capitalize">{booking.type}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{booking.customerName}</div>
                    <div className="text-sm text-gray-500">{booking.customerEmail}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{formatDate(booking.startDate)}</div>
                    {booking.startDate !== booking.endDate && (
                      <div className="text-gray-500">to {formatDate(booking.endDate)}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(booking.totalPrice)}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(booking.status)}>
                    {booking.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
