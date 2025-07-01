import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

interface UserProfile {
  id: number;
  username: string;
  email: string;
  fullName: string;
  businessName: string;
  businessType: string;
  phone: string;
  description: string;
  address: string;
  role: string;
}

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [paymentMethods, setPaymentMethods] = useState([
    {
      id: 1,
      type: 'bank',
      name: 'Bank Account',
      details: 'Primary • Local Bank Ltd. ending in 4582',
      isPrimary: true
    }
  ]);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    type: 'credit_card',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    holderName: '',
    bankName: '',
    accountNumber: '',
    routingNumber: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('islandloaf_auth_token') ? JSON.parse(localStorage.getItem('islandloaf_auth_token')!).token : ''}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile data');
        }

        const data = await response.json();
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile data');
        console.error('Profile fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);
  
  const handleConnectMarketplace = async () => {
    try {
      const res = await fetch('/api/vendor/connect-marketplace', { method: 'POST' });
      if (res.ok) {
        toast({
          title: "Success",
          description: "Connected successfully to marketplace"
        });
      } else {
        throw new Error("Failed to connect");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to marketplace",
        variant: "destructive"
      });
    }
  };

  const handleAddPaymentMethod = () => {
    const newMethod = {
      id: paymentMethods.length + 1,
      type: newPayment.type,
      name: newPayment.type === 'credit_card' ? 'Credit Card' : 'Bank Account',
      details: newPayment.type === 'credit_card' 
        ? `**** **** **** ${newPayment.cardNumber.slice(-4)}` 
        : `${newPayment.bankName} ending in ${newPayment.accountNumber.slice(-4)}`,
      isPrimary: false
    };
    
    setPaymentMethods([...paymentMethods, newMethod]);
    setIsAddPaymentOpen(false);
    setNewPayment({
      type: 'credit_card',
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      holderName: '',
      bankName: '',
      accountNumber: '',
      routingNumber: ''
    });
    
    toast({
      title: "Success",
      description: "Payment method added successfully"
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <div className="text-center py-8 text-red-500">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <div className="text-center py-8 text-gray-500">
          Profile data is not available at the moment.
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <Button 
          className="w-full md:w-auto"
          onClick={handleConnectMarketplace}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path>
            <path d="M8.5 8.5v.01"></path>
            <path d="M16 15.5v.01"></path>
            <path d="M12 12v.01"></path>
            <path d="M11 17v.01"></path>
            <path d="M7 14v.01"></path>
          </svg>
          Connect to Marketplace
        </Button>
      </div>
      
      <Tabs defaultValue="business" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="business">Business Profile</TabsTrigger>
          <TabsTrigger value="account">Account Settings</TabsTrigger>
          <TabsTrigger value="payments">Payment Methods</TabsTrigger>
        </TabsList>
        
        <TabsContent value="business" className="mt-4 space-y-5">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="w-full md:w-1/3">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mb-2 relative group">
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                        <Button variant="ghost" size="sm" className="text-transparent group-hover:text-white">
                          Change
                        </Button>
                      </div>
                      <span className="text-5xl text-gray-400">{profile.businessName.charAt(0)}</span>
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold">{profile.businessName}</h3>
                      <p className="text-sm text-muted-foreground">{profile.businessType}</p>
                    </div>
                    <div className="text-center text-sm p-3 bg-green-50 text-green-700 rounded-md border border-green-200 w-full">
                      <p className="font-medium">Verified Business</p>
                      <p className="mt-1">Joined {new Date(profile.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                </div>
                
                <div className="w-full md:w-2/3 space-y-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Business Name</label>
                      <Input defaultValue={profile.businessName} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Business Type</label>
                      <Select defaultValue={profile.businessType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="accommodation">Accommodation</SelectItem>
                          <SelectItem value="transport">Transport</SelectItem>
                          <SelectItem value="activity">Activity/Tour</SelectItem>
                          <SelectItem value="restaurant">Restaurant</SelectItem>
                          <SelectItem value="wellness">Wellness</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Business Description</label>
                    <Textarea 
                      defaultValue={profile.description} 
                      className="min-h-[120px]"
                    />
                    <p className="text-xs text-muted-foreground">This description will be shown to potential customers on your listings.</p>
                  </div>
                  
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Phone Number</label>
                      <Input defaultValue={profile.phone} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <Input defaultValue={profile.email} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Business Address</label>
                    <Input defaultValue={profile.address} />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Services Offered</label>
                    <div className="grid gap-3 grid-cols-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="wifi" defaultChecked />
                        <Label htmlFor="wifi">WiFi</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="breakfast" defaultChecked />
                        <Label htmlFor="breakfast">Breakfast</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="parking" defaultChecked />
                        <Label htmlFor="parking">Parking</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="pool" />
                        <Label htmlFor="pool">Swimming Pool</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="gym" />
                        <Label htmlFor="gym">Gym</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="spa" />
                        <Label htmlFor="spa">Spa</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="account" className="mt-4 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input defaultValue={profile.fullName} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username</label>
                  <Input defaultValue={profile.username} />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <Input defaultValue={profile.email} type="email" />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input defaultValue={profile.phone} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Input defaultValue={profile.role} disabled />
                <p className="text-xs text-muted-foreground">Role cannot be changed</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="payments" className="mt-4 space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Payment Methods</CardTitle>
                <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                        <path d="M5 12h14"></path>
                        <path d="M12 5v14"></path>
                      </svg>
                      Add Payment Method
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Payment Method</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Payment Type</label>
                        <Select value={newPayment.type} onValueChange={(value) => setNewPayment({...newPayment, type: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="credit_card">Credit Card</SelectItem>
                            <SelectItem value="bank">Bank Account</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {newPayment.type === 'credit_card' ? (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Card Number</label>
                            <Input 
                              value={newPayment.cardNumber} 
                              onChange={(e) => setNewPayment({...newPayment, cardNumber: e.target.value})}
                              placeholder="1234 5678 9012 3456"
                            />
                          </div>
                          <div className="grid gap-4 grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Expiry Date</label>
                              <Input 
                                value={newPayment.expiryDate} 
                                onChange={(e) => setNewPayment({...newPayment, expiryDate: e.target.value})}
                                placeholder="MM/YY"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">CVV</label>
                              <Input 
                                value={newPayment.cvv} 
                                onChange={(e) => setNewPayment({...newPayment, cvv: e.target.value})}
                                placeholder="123"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Cardholder Name</label>
                            <Input 
                              value={newPayment.holderName} 
                              onChange={(e) => setNewPayment({...newPayment, holderName: e.target.value})}
                              placeholder="John Doe"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Bank Name</label>
                            <Input 
                              value={newPayment.bankName} 
                              onChange={(e) => setNewPayment({...newPayment, bankName: e.target.value})}
                              placeholder="Bank Name"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Account Number</label>
                            <Input 
                              value={newPayment.accountNumber} 
                              onChange={(e) => setNewPayment({...newPayment, accountNumber: e.target.value})}
                              placeholder="Account Number"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Routing Number</label>
                            <Input 
                              value={newPayment.routingNumber} 
                              onChange={(e) => setNewPayment({...newPayment, routingNumber: e.target.value})}
                              placeholder="Routing Number"
                            />
                          </div>
                        </>
                      )}
                      
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsAddPaymentOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddPaymentMethod}>
                          Add Payment Method
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        {method.type === 'credit_card' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="20" height="14" x="2" y="5" rx="2"></rect>
                            <line x1="2" x2="22" y1="10" y2="10"></line>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 21h18"></path>
                            <path d="M3 10h18"></path>
                            <path d="M5 6h14"></path>
                            <path d="M4 6h16v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"></path>
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{method.name}</p>
                        <p className="text-sm text-muted-foreground">{method.details}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {method.isPrimary && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Primary</span>
                      )}
                      <Button variant="ghost" size="sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;