import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import StatCard from "@/components/dashboard/stat-card";
import RevenueChart from "@/components/dashboard/revenue-chart";
import ServiceBreakdown from "@/components/dashboard/service-breakdown";
import { useAuth } from "@/lib/auth";

interface OverviewData {
  revenueData: Array<{ date: string; revenue: number }>;
  serviceTypes: Array<{
    type: string;
    percentage: number;
    icon: string;
    color: { bg: string; text: string };
  }>;
  stats: {
    totalRevenue: string;
    bookings: string;
    avgRating: string;
    conversionRate: string;
    revenueTrend: { value: string; isPositive: boolean };
    bookingsTrend: { value: string; isPositive: boolean };
    ratingTrend: { value: string; isPositive: boolean };
    conversionTrend: { value: string; isPositive: boolean };
  };
}

const Overview = () => {
  const { user } = useAuth();
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/dashboard/overview', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('islandloaf_auth_token') ? JSON.parse(localStorage.getItem('islandloaf_auth_token')!).token : ''}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch overview data');
        }

        const data = await response.json();
        setOverviewData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load overview data');
        console.error('Overview data fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        </div>
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!overviewData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        </div>
        <Alert>
          <AlertTitle>No Data Available</AlertTitle>
          <AlertDescription>Overview data is not available at the moment.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</span>
        </div>
      </div>
      
      {/* Welcome alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertTitle className="text-blue-800 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
            <path d="M4 22h16"></path>
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
          </svg> 
          Welcome back, {user?.fullName || 'User'}!
        </AlertTitle>
        <AlertDescription className="text-blue-700">
          Your {user?.businessType || 'tourism'} business dashboard is ready. Check your upcoming schedule below.
        </AlertDescription>
      </Alert>
      
      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Revenue"
          value={overviewData.stats.totalRevenue}
          icon="dollar-sign"
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
          trend={overviewData.stats.revenueTrend}
          subtitle="vs. last month"
        />
        <StatCard 
          title="Bookings"
          value={overviewData.stats.bookings}
          icon="calendar"
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          trend={overviewData.stats.bookingsTrend}
          subtitle="vs. last month"
        />
        <StatCard 
          title="Avg. Rating"
          value={overviewData.stats.avgRating}
          icon="star"
          iconColor="text-amber-600"
          iconBgColor="bg-amber-100"
          trend={overviewData.stats.ratingTrend}
          subtitle="vs. last month"
        />
        <StatCard 
          title="Conversion Rate"
          value={overviewData.stats.conversionRate}
          icon="percent"
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
          trend={overviewData.stats.conversionTrend}
          subtitle="vs. last month"
        />
      </div>
      
      {/* Revenue chart & Service breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-2">Revenue Trend</h3>
            <RevenueChart data={overviewData.revenueData} />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-2">Service Breakdown</h3>
            <ServiceBreakdown services={overviewData.serviceTypes} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Overview;