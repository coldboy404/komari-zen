/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const InstancePage = lazy(() => import("@/pages/InstancePage"));

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          index
          element={
            <Suspense fallback={null}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route
          path="instance/:uuid"
          element={
            <Suspense fallback={null}>
              <InstancePage />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}
