import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { addCalendarSource, syncCalendar } from "@/lib/api";
import { CalendarSource } from "@shared/schema";
import { format } from "date-fns";
import { Loader2, RefreshCw, Trash2, PlusCircle, Calendar } from "lucide-react";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const addCalendarSourceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Please enter a valid URL"),
  type: z.string().min(1, "Type is required"),
  serviceId: z.string().optional(),
});

type FormValues = z.infer<typeof addCalendarSourceSchema>;

export default function CalendarSync() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  
  // Get calendar sources
  const { data: calendarSources, isLoading } = useQuery({
    queryKey: ['/api/calendar-sources'],
  });
  
  // Get services for dropdown
  const { data: services } = useQuery({
    queryKey: ['/api/services'],
  });
  
  // Add calendar source mutation
  const addSourceMutation = useMutation({
    mutationFn: addCalendarSource,
    onSuccess: () => {
      toast({
        title: "Calendar source added",
        description: "Your calendar source has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-sources'] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to add calendar source",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Sync calendar mutation
  const syncCalendarMutation = useMutation({
    mutationFn: syncCalendar,
    onSuccess: (data) => {
      toast({
        title: "Calendar synced",
        description: data.message || "Your calendar has been synced successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-sources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-events'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to sync calendar",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(addCalendarSourceSchema),
    defaultValues: {
      name: "",
      url: "",
      type: "",
      serviceId: "",
    },
  });
  
  function onSubmit(data: FormValues) {
    addSourceMutation.mutate({
      name: data.name,
      url: data.url,
      type: data.type,
      serviceId: data.serviceId ? parseInt(data.serviceId) : undefined,
    });
  }
  
  function handleSyncCalendar(sourceId: number) {
    syncCalendarMutation.mutate(sourceId);
  }
  
  // Mock calendar sources for UI demonstration
  const mockCalendarSources: CalendarSource[] = [
    {
      id: 1,
      userId: 1,
      name: "Google Calendar",
      url: "https://calendar.google.com/calendar/ical/example%40gmail.com/private-abc123def456/basic.ics",
      type: "google",
      lastSynced: new Date("2023-01-01T14:30:00"),
      serviceId: 1,
      createdAt: new Date("2022-12-01T10:00:00"),
    },
    {
      id: 2,
      userId: 1,
      name: "Airbnb Calendar",
      url: "https://www.airbnb.com/calendar/ical/123456.ics?s=abc123def456",
      type: "airbnb",
      lastSynced: new Date("2023-01-01T12:15:00"),
      serviceId: 1,
      createdAt: new Date("2022-12-05T11:00:00"),
    },
    {
      id: 3,
      userId: 1,
      name: "Booking.com Calendar",
      url: "https://admin.booking.com/hotel/ical/123456.ics",
      type: "booking.com",
      lastSynced: new Date("2023-01-01T15:45:00"),
      serviceId: 2,
      createdAt: new Date("2022-12-10T09:30:00"),
    },
  ];
  
  // Mock services for UI demonstration
  const mockServices = [
    { id: 1, name: "Ocean View Villa", type: "stays" },
    { id: 2, name: "Jeep Rental", type: "vehicles" },
    { id: 3, name: "Island Tour Package", type: "tours" },
  ];

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold mb-4 md:mb-0">Calendar Sync</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Calendar Source
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Calendar Source</DialogTitle>
              <DialogDescription>
                Connect an external calendar to sync bookings and blocked dates.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calendar Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Google Calendar" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>iCal URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://calendar.google.com/calendar/ical/..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the iCal/ICS URL from your external calendar service
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calendar Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a calendar type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="google">Google Calendar</SelectItem>
                          <SelectItem value="airbnb">Airbnb</SelectItem>
                          <SelectItem value="booking.com">Booking.com</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Associated Service (Optional)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a service" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No specific service</SelectItem>
                          {mockServices.map(service => (
                            <SelectItem key={service.id} value={service.id.toString()}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Connect this calendar to a specific service, or leave empty to apply to all
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={form.handleSubmit(onSubmit)}
                disabled={addSourceMutation.isPending}
              >
                {addSourceMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Calendar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Connected Calendars</CardTitle>
          <CardDescription>
            Manage your external calendars and keep them in sync with IslandLoaf
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="mb-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/calendar-sources'] })}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync All Calendars
                </Button>
              </div>
              
              <div className="space-y-4">
                {mockCalendarSources.map((source) => (
                  <Card key={source.id} className="overflow-hidden">
                    <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary mr-4">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-medium">{source.name}</h3>
                          <p className="text-sm text-neutral-500 truncate max-w-md">
                            {source.url}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleSyncCalendar(source.id)}
                          disabled={syncCalendarMutation.isPending}
                        >
                          {syncCalendarMutation.isPending && syncCalendarMutation.variables === source.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          )}
                          Sync Now
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 bg-neutral-50">
                      <div className="flex flex-wrap gap-2 text-sm">
                        <div className="text-neutral-500">
                          <span className="font-medium">Type:</span> {source.type}
                        </div>
                        <div className="text-neutral-500">
                          <span className="font-medium">Last Synced:</span>{" "}
                          {source.lastSynced ? format(new Date(source.lastSynced), "MMM d, yyyy h:mm a") : "Never"}
                        </div>
                        <div className="text-neutral-500">
                          <span className="font-medium">Service:</span>{" "}
                          {mockServices.find(s => s.id === source.serviceId)?.name || "All Services"}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                
                {mockCalendarSources.length === 0 && (
                  <div className="text-center p-8 border rounded-md bg-neutral-50">
                    <Calendar className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium mb-1">No calendars connected</h3>
                    <p className="text-neutral-500 mb-4">
                      Connect external calendars to automatically sync your availability
                    </p>
                    <Button onClick={() => setIsDialogOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Calendar Source
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
