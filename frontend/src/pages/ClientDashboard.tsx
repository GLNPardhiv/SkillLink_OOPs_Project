import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LayoutDashboard, Briefcase, Wallet, User, TrendingUp, Rocket } from "lucide-react";

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("skilllink_user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      if (userData.role !== "client") {
        navigate("/freelancer-dashboard");
      } else {
        setUser(userData);
      }
    } else {
      navigate("/login");
    }
  }, [navigate]);

  if (!user) return null;

  const demoJobs = [
    {
      id: "SKL-007",
      title: "Mobile App UI/UX Redesign",
      status: "In Progress",
      statusColor: "bg-info",
      applicants: 0,
    },
    {
      id: "SKL-007",
      title: "Mobile App UI/UX Review",
      status: "Pending Review",
      statusColor: "bg-warning",
      applicants: 0,
    },
    {
      id: "SKL-007",
      title: "Mobile App UI/UX Redesign",
      status: "Open",
      statusColor: "bg-success",
      applicants: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className="flex">
        <aside className="w-64 min-h-screen bg-card border-r border-border p-4">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold">S</span>
            </div>
            <span className="font-bold text-primary text-xl">SkillLink</span>
          </div>

          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-2">Welcome Back,</p>
            <p className="font-semibold">{user.profile?.displayName || user.name}!</p>
          </div>

          <nav className="space-y-2">
            <Button variant="default" className="w-full justify-start gap-2">
              <LayoutDashboard size={18} />
              Dashboard
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Briefcase size={18} />
              My Jobs
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Wallet size={18} />
              Wallet
            </Button>
            <Link to="/edit-profile" className="block">
              <Button variant="ghost" className="w-full justify-start gap-2">
                <User size={18} />
                Profile
              </Button>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Top Stats */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Wallet Balance
                  </CardTitle>
                  <span className="text-2xl">$</span>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">
                    ${user.wallet?.balance?.toFixed(2) || "8,450.75"}
                  </div>
                  <div className="flex gap-2 text-sm">
                    <button className="text-primary hover:underline">Add Funds</button>
                    <span className="text-muted-foreground">•</span>
                    <button className="text-primary hover:underline">View Transactions</button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                <CardContent className="pt-6">
                  <Button size="lg" className="w-full gap-2">
                    <Rocket size={20} />
                    Post New Job & Hire Talent
                  </Button>
                  <div className="mt-4">
                    <TrendingUp className="w-20 h-20 text-primary/20 ml-auto" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Posted Jobs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Your Posted Jobs</CardTitle>
                <Button variant="outline" size="sm">
                  Filter ↓
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {demoJobs.map((job, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/50 transition"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-1 h-12 bg-primary rounded-full" />
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{job.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>#{job.id}</span>
                          <span>•</span>
                          <Badge
                            variant="secondary"
                            className={`${job.statusColor} text-white border-0`}
                          >
                            {job.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {job.applicants > 0 && (
                        <Button variant="default" size="sm">
                          View Applicants ({job.applicants})
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        {job.status === "Open" ? "Manage Job" : "View Details"}
                      </Button>
                    </div>
                  </div>
                ))}

                {demoJobs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No jobs posted yet. Start by posting your first job!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ClientDashboard;