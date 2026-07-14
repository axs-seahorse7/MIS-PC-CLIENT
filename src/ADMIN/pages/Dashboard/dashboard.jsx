import { Row, Col } from "antd";

import DashboardHeader from "./components/DashboardHeader";
import DashboardCards from "./components/cards/DashboardCards";
import SummaryCards from "./components/cards/SummaryCards";

import FactoryOverview from "./components/pipeline/FactoryOverview";
import ProductionFlow from "./components/pipeline/ProductionFlow";
import ProductionPipeline from "./components/pipeline/ProductionPipeline";
import LineStatus from "./components/pipeline/LineStatus";

import RecentActivity from "./components/activity/RecentActivity";
import AlertsPanel from "./components/activity/AlertsPanel";

import ProductionAnalytics from "./components/charts/ProductionAnalytics";
import HourlyProductionChart from "./components/charts/HourlyProductionChart";

const Dashboard = () => {
  return (
    <>
      <DashboardHeader />
      <DashboardCards />
      <SummaryCards />
      <FactoryOverview />
      <ProductionFlow />
      <ProductionPipeline />

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={8}>
          <LineStatus />
        </Col>

        <Col xs={24} lg={16}>
          <RecentActivity />
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={8}>
          <AlertsPanel />
        </Col>

        <Col xs={24} lg={16}>
          <ProductionAnalytics />
        </Col>
      </Row>

      <div style={{ marginTop: 24 }}>
        <HourlyProductionChart />
      </div>
    </>
  );
};

export default Dashboard;