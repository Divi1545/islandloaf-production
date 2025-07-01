import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Save, 
  Plus, 
  Trash2, 
  Calendar,
  Percent,
  Tag
} from "lucide-react";

interface Service {
  id: number;
  name: string;
  type: string;
  basePrice: number;
  description: string;
}

interface PromoCode {
  id: number;
  code: string;
  discount: number;
  type: string;
  validUntil: string;
}

export default function PricingEngine() {
  const [services, setServices] = useState<Service[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pricing rules state
  const [weekendSurcharge, setWeekendSurcharge] = useState(25);
  const [holidaySurcharge, setHolidaySurcharge] = useState(50);
  const [extraGuestFee, setExtraGuestFee] = useState(15);
  const [minStay, setMinStay] = useState(2);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [servicesResponse, promoCodesResponse] = await Promise.all([
          fetch('/api/services', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('islandloaf_auth_token') ? JSON.parse(localStorage.getItem('islandloaf_auth_token')!).token : ''}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch('/api/promotions', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('islandloaf_auth_token') ? JSON.parse(localStorage.getItem('islandloaf_auth_token')!).token : ''}`,
              'Content-Type': 'application/json',
            },
          })
        ]);

        if (servicesResponse.ok) {
          const servicesData = await servicesResponse.json();
          setServices(servicesData);
        }

        if (promoCodesResponse.ok) {
          const promoCodesData = await promoCodesResponse.json();
          setPromoCodes(promoCodesData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pricing data');
        console.error('Pricing data fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const updateServicePrice = async (serviceId: number, basePrice: number) => {
    try {
      const response = await fetch(`/api/services/${serviceId}/price`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('islandloaf_auth_token') ? JSON.parse(localStorage.getItem('islandloaf_auth_token')!).token : ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ basePrice }),
      });

      if (response.ok) {
        // Update local state
        setServices(prev => prev.map(service => 
          service.id === serviceId ? { ...service, basePrice } : service
        ));
      }
    } catch (error) {
      console.error('Failed to update service price:', error);
    }
  };

  const savePricingRules = async () => {
    try {
      const response = await fetch('/api/pricing/rules', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('islandloaf_auth_token') ? JSON.parse(localStorage.getItem('islandloaf_auth_token')!).token : ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekendSurcharge,
          holidaySurcharge,
          extraGuestFee,
          minStay,
        }),
      });

      if (response.ok) {
        console.log('Pricing rules saved successfully');
      }
    } catch (error) {
      console.error('Failed to save pricing rules:', error);
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-6">Pricing Engine</h1>
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
      <div>
        <h1 className="text-2xl font-semibold mb-6">Pricing Engine</h1>
        <div className="text-center py-8 text-red-500">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Pricing Engine</h1>
      
      <Tabs defaultValue="base-pricing">
        <TabsList className="mb-6">
          <TabsTrigger value="base-pricing">Base Pricing</TabsTrigger>
          <TabsTrigger value="rules">Pricing Rules</TabsTrigger>
          <TabsTrigger value="promos">Promotions</TabsTrigger>
          <TabsTrigger value="blackout-dates">Blackout Dates</TabsTrigger>
        </TabsList>
        
        {/* Base Pricing Tab */}
        <TabsContent value="base-pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Base Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {services.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No services found. Add services to configure pricing.
                  </div>
                ) : (
                  services.map((service) => (
                    <div key={service.id} className="border rounded-md p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-lg">{service.name}</h3>
                          <p className="text-neutral-500 text-sm">{service.type} • {service.description}</p>
                        </div>
                        
                        <div className="flex gap-4 items-center">
                          <div className="w-full md:w-48">
                            <Label htmlFor={`price-${service.id}`}>Base Price ($)</Label>
                            <div className="flex">
                              <div className="flex items-center bg-neutral-100 px-3 rounded-l-md border border-r-0 border-input">
                                <DollarSign className="h-4 w-4 text-neutral-500" />
                              </div>
                              <Input
                                id={`price-${service.id}`}
                                type="number"
                                className="rounded-l-none"
                                defaultValue={service.basePrice}
                                onChange={(e) => {
                                  const newPrice = parseFloat(e.target.value);
                                  if (!isNaN(newPrice)) {
                                    updateServicePrice(service.id, newPrice);
                                  }
                                }}
                              />
                            </div>
                          </div>
                          
                          <Button
                            variant="outline"
                            onClick={() => {
                              const input = document.getElementById(`price-${service.id}`) as HTMLInputElement;
                              const newPrice = parseFloat(input.value);
                              if (!isNaN(newPrice)) {
                                updateServicePrice(service.id, newPrice);
                              }
                            }}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pricing Rules Tab */}
        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">Weekend Pricing</h3>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="weekend-surcharge">Weekend Surcharge (%)</Label>
                      <span className="font-medium">{weekendSurcharge}%</span>
                    </div>
                    
                    <Slider
                      id="weekend-surcharge"
                      defaultValue={[weekendSurcharge]}
                      max={100}
                      step={5}
                      onValueChange={(values) => setWeekendSurcharge(values[0])}
                    />
                    
                    <div className="flex items-center space-x-2 pt-2">
                      <Switch id="apply-weekend" />
                      <Label htmlFor="apply-weekend">Apply weekend pricing</Label>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-medium">Holiday Pricing</h3>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="holiday-surcharge">Holiday Surcharge (%)</Label>
                      <span className="font-medium">{holidaySurcharge}%</span>
                    </div>
                    
                    <Slider
                      id="holiday-surcharge"
                      defaultValue={[holidaySurcharge]}
                      max={100}
                      step={5}
                      onValueChange={(values) => setHolidaySurcharge(values[0])}
                    />
                    
                    <div className="flex items-center space-x-2 pt-2">
                      <Switch id="apply-holiday" />
                      <Label htmlFor="apply-holiday">Apply holiday pricing</Label>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4">Additional Rules</h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="extra-guest-fee">Extra Guest Fee ($)</Label>
                        <div className="flex">
                          <div className="flex items-center bg-neutral-100 px-3 rounded-l-md border border-r-0 border-input">
                            <DollarSign className="h-4 w-4 text-neutral-500" />
                          </div>
                          <Input
                            id="extra-guest-fee"
                            type="number"
                            className="rounded-l-none"
                            value={extraGuestFee}
                            onChange={(e) => setExtraGuestFee(parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="min-stay">Minimum Stay (nights)</Label>
                        <Input
                          id="min-stay"
                          type="number"
                          value={minStay}
                          onChange={(e) => setMinStay(parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button className="w-full md:w-auto" onClick={savePricingRules}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Pricing Rules
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Promotions Tab */}
        <TabsContent value="promos" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Promotional Codes</CardTitle>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Promo Code
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {promoCodes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No promotional codes found. Create your first promo code to get started.
                  </div>
                ) : (
                  promoCodes.map((promo) => (
                    <div key={promo.id} className="border rounded-md p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Tag className="h-5 w-5 text-blue-500" />
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono">
                                {promo.code}
                              </Badge>
                              <Badge variant={promo.type === 'percentage' ? 'default' : 'secondary'}>
                                {promo.discount}{promo.type === 'percentage' ? '%' : '$'} off
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              Valid until {new Date(promo.validUntil).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Blackout Dates Tab */}
        <TabsContent value="blackout-dates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Blackout Dates</CardTitle>
                <Button size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Add Blackout Date
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                No blackout dates configured. Add dates when services are unavailable.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
