import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Proposal } from "@shared/schema";
import { FileText, CheckCircle2, XCircle } from "lucide-react";

const proposalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum(["Equipment", "Process Improvement", "Training", "Other"], {
    errorMap: () => ({ message: "Please select a category" })
  }),
  estimatedCost: z.coerce.number().positive("Cost must be positive"),
  description: z.string().min(1, "Description is required"),
});

type ProposalData = z.infer<typeof proposalSchema>;

export default function ProposalContent() {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<ProposalData>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      title: "",
      category: "Other",
      estimatedCost: 0,
      description: "",
    },
  });

  const { data: proposals, isLoading } = useQuery<Proposal[]>({
    queryKey: ["/api/proposals"],
  });

  const submitProposalMutation = useMutation({
    mutationFn: async (data: ProposalData) => {
      const res = await apiRequest("POST", "/api/proposal", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Proposal submitted successfully!",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const approveProposalMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/proposal/${id}/approve`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Proposal approved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectProposalMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/proposal/${id}/reject`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Proposal rejected successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProposalData) => {
    submitProposalMutation.mutate(data);
  };

  const isManager = user?.role === "manager";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Submit Proposal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Submit Proposal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Proposal title..."
                        data-testid="input-title"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Equipment">Equipment</SelectItem>
                        <SelectItem value="Process Improvement">Process Improvement</SelectItem>
                        <SelectItem value="Training">Training</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimatedCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Cost</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        data-testid="input-cost"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Detailed description..."
                        rows={4}
                        data-testid="input-description"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full"
                disabled={submitProposalMutation.isPending}
                data-testid="button-submit-proposal"
              >
                {submitProposalMutation.isPending ? "Submitting..." : "Submit Proposal"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Pending Proposals */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isManager ? "All Proposals" : "Your Proposals"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading proposals...</div>
          ) : proposals && proposals.length > 0 ? (
            <div className="space-y-4">
              {proposals.map((proposal) => (
                <div key={proposal.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-foreground">{proposal.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {proposal.category} • ${parseFloat(proposal.estimatedCost || "0").toFixed(2)}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        proposal.status === "approved" ? "default" : 
                        proposal.status === "rejected" ? "destructive" : 
                        "secondary"
                      }
                    >
                      {proposal.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {proposal.description}
                  </p>
                  {isManager && proposal.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveProposalMutation.mutate(proposal.id)}
                        disabled={approveProposalMutation.isPending}
                        data-testid={`button-approve-${proposal.id}`}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectProposalMutation.mutate(proposal.id)}
                        disabled={rejectProposalMutation.isPending}
                        data-testid={`button-reject-${proposal.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No proposals found</p>
              <p className="text-sm">Submit your first proposal using the form</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
