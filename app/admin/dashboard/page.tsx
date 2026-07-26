import { Card } from "@heroui/react";
import { RecentOrdersTable } from "./RecentOrdersTable";

interface StatCard {
  label: string;
  value: string;
}

const STATS: StatCard[] = [
  { label: "Total Orders", value: "1,284" },
  { label: "Revenue", value: "$48,920" },
  { label: "Products", value: "312" },
  { label: "Low Stock", value: "7" },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <Card key={stat.label}>
            <Card.Header>
              <Card.Title>{stat.label}</Card.Title>
            </Card.Header>
            <Card.Content>
              <p className="text-foreground text-3xl font-semibold">{stat.value}</p>
            </Card.Content>
          </Card>
        ))}
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-foreground text-lg font-semibold">Recent Orders</h2>
        <RecentOrdersTable />
      </section>
    </div>
  );
}
