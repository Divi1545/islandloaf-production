import React, { useEffect, useState } from 'react';

interface CalendarDayProps {
  day: number;
  status?: "available" | "booked" | "pending";
}

function CalendarDay({ day, status }: CalendarDayProps) {
  return (
    <div 
      className={`
        h-10 w-10 flex items-center justify-center rounded-full
        ${status === "available" ? "bg-green-100 text-green-700" : 
          status === "booked" ? "bg-red-100 text-red-700" : 
          status === "pending" ? "bg-amber-100 text-amber-700" : 
          "bg-transparent"}
      `}
    >
      {day}
    </div>
  );
}

interface AvailabilityData {
  [key: number]: "available" | "booked" | "pending";
}

const CalendarOverview = () => {
  const [availability, setAvailability] = useState<AvailabilityData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();
  
  // Generate days in month - this is a simplified version
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/calendar/availability?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('islandloaf_auth_token') ? JSON.parse(localStorage.getItem('islandloaf_auth_token')!).token : ''}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch availability data');
        }

        const data = await response.json();
        setAvailability(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load availability data');
        console.error('Availability fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailability();
  }, [currentDate]);

  const handlePreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 animate-pulse rounded"></div>
        <div className="grid grid-cols-7 gap-1">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 animate-pulse rounded-full"></div>
          ))}
        </div>
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
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium">{currentMonth} {currentYear}</h4>
        <div className="flex items-center space-x-2">
          <button 
            className="p-1 rounded hover:bg-gray-100"
            onClick={handlePreviousMonth}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"></path>
            </svg>
          </button>
          <button 
            className="p-1 rounded hover:bg-gray-100"
            onClick={handleNextMonth}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6"></path>
            </svg>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-xs font-medium text-muted-foreground py-1">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {/* First day offset - for simplicity assuming month starts on Sunday */}
        {daysInMonth.map((day) => (
          <div key={day} className="flex justify-center py-1">
            <CalendarDay 
              day={day} 
              status={availability[day]}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarOverview;