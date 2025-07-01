import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Vendor {
  id: string;
  name: string;
  owner: string;
  email: string;
  phone: string;
  business: string;
  revenue: string;
  status: string;
  verified: boolean;
  joinDate: string;
  location: string;
  rating: number | null;
  listings: number;
  completedBookings: number;
  description: string;
}

// Vendor Detail Dialog component
const VendorDetailDialog = ({ vendor }: { vendor: Vendor }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <span className="sr-only">View details</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <span>{vendor.name}</span>
            {vendor.verified && (
              <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                Verified
              </Badge>
            )}
            <Badge className={`ml-2 ${
              vendor.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Business Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">ID</p>
                <p className="text-sm font-medium">{vendor.id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Business Type</p>
                <p className="text-sm font-medium">{vendor.business}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Location</p>
                <p className="text-sm font-medium">{vendor.location}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Join Date</p>
                <p className="text-sm font-medium">{new Date(vendor.joinDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm">{vendor.description}</p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Owner</p>
                <p className="text-sm font-medium">{vendor.owner}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium">{vendor.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm font-medium">{vendor.phone}</p>
              </div>
            </div>
            
            <h3 className="text-sm font-medium text-gray-500 mt-6 mb-2">Performance</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Revenue</p>
                <p className="text-sm font-medium">{vendor.revenue}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Listings</p>
                <p className="text-sm font-medium">{vendor.listings}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Completed Bookings</p>
                <p className="text-sm font-medium">{vendor.completedBookings}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Rating</p>
                <p className="text-sm font-medium">{vendor.rating ? `${vendor.rating}/5.0` : 'No ratings yet'}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between mt-6">
          <div className="space-x-2">
            <Button variant="outline" size="sm">Message</Button>
            <Button variant="outline" size="sm">
              {vendor.verified ? 'Remove Verification' : 'Verify Vendor'}
            </Button>
          </div>
          <div className="space-x-2">
            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
              {vendor.status === 'active' ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const VendorManagement = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/admin/vendors', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('islandloaf_auth_token') ? JSON.parse(localStorage.getItem('islandloaf_auth_token')!).token : ''}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch vendors');
        }

        const data = await response.json();
        setVendors(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load vendors');
        console.error('Vendors fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendors();
  }, []);

  const handleAddNewVendor = () => {
    toast({
      title: "Add New Vendor",
      description: "This feature will be implemented in the next update.",
    });
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Vendor Management</h1>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Vendor Management</h1>
        </div>
        <div className="text-center py-8 text-red-500">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Vendor Management</h1>
        <Button onClick={handleAddNewVendor}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <path d="M5 12h14"></path>
            <path d="M12 5v14"></path>
          </svg>
          Add New Vendor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendors Overview</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredVendors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm || statusFilter !== 'all' ? 'No vendors match your filters.' : 'No vendors found.'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVendors.map((vendor) => (
                <div key={vendor.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-lg font-medium text-gray-600">
                        {vendor.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium">{vendor.name}</h3>
                      <p className="text-sm text-gray-500">{vendor.owner} • {vendor.business}</p>
                      <p className="text-xs text-gray-400">{vendor.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge className={`${
                      vendor.status === 'active' ? 'bg-green-100 text-green-800' : 
                      vendor.status === 'pending' ? 'bg-amber-100 text-amber-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
                    </Badge>
                    {vendor.verified && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Verified
                      </Badge>
                    )}
                    <VendorDetailDialog vendor={vendor} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorManagement;