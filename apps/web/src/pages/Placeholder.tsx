import { Card, Typography } from "@arco-design/web-react";

export function Placeholder({ title }: { title: string }) {
  return (
    <div className="page">
      <Typography.Title heading={3}>{title}</Typography.Title>
      <Card bordered={false}>
        <Typography.Text type="secondary">This MVP page is scaffolded and ready for the next feature slice.</Typography.Text>
      </Card>
    </div>
  );
}
