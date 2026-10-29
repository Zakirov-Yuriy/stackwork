"use client";

import { useEffect, useRef } from "react";
import type ApexCharts from "apexcharts";
import type { ApexOptions } from "apexcharts";

/* Графики ApexCharts, как в статистике ИКАН. Библиотека грузится только в браузере. */

function isDark() {
  return document.documentElement.dataset.adminTheme === "dark";
}

function palette() {
  return isDark() ? { text: "#a3a4cc", grid: "#444564", mode: "dark" as const } : { text: "#697a8d", grid: "#eceef1", mode: "light" as const };
}

function useApex(build: () => ApexOptions, deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let chart: ApexCharts | null = null;
    let cancelled = false;
    const el = ref.current;
    if (!el) return;
    import("apexcharts").then(({ default: Apex }) => {
      if (cancelled || !ref.current) return;
      const instance = new Apex(el, build());
      chart = instance;
      void instance.render();
    });
    // Смена темы: перекрасить подписи и сетку
    const observer = new MutationObserver(() => chart?.updateOptions(build()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-admin-theme"] });
    return () => {
      cancelled = true;
      observer.disconnect();
      chart?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

export function AreaChart({ days, visitors, views, applications }: { days: string[]; visitors: number[]; views: number[]; applications: number[] }) {
  const labels = days.map((d) => new Date(`${d}T00:00:00`).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }));
  const ref = useApex(
    () => {
      const c = palette();
      return {
        chart: { type: "area", height: 340, foreColor: c.text, toolbar: { show: false }, background: "transparent", fontFamily: "inherit", zoom: { enabled: false } },
        theme: { mode: c.mode },
        grid: { borderColor: c.grid },
        series: [
          { name: "Посетители", type: "area", data: visitors },
          { name: "Просмотры страниц", type: "area", data: views },
          { name: "Отклики", type: "line", data: applications },
        ],
        colors: ["#03a9f4", "#696cff", "#ff3e1d"],
        fill: { type: ["gradient", "gradient", "solid"], gradient: { opacityFrom: 0.45, opacityTo: 0.05 } },
        stroke: { curve: "smooth", width: [3, 2, 2] },
        dataLabels: { enabled: false },
        markers: { size: days.length <= 31 ? 3 : 0 },
        xaxis: { categories: labels, labels: { rotate: -45, rotateAlways: days.length > 14, hideOverlappingLabels: true } },
        yaxis: { opposite: true, min: 0, forceNiceScale: true, labels: { formatter: (v: number) => String(Math.round(v)) } },
        legend: { horizontalAlign: "left" },
        tooltip: { shared: true, intersect: false },
      };
    },
    [days.join(","), visitors.join(","), views.join(","), applications.join(",")],
  );
  return <div ref={ref} className="min-h-[340px]" />;
}

export function DonutChart({ labels, series, total }: { labels: string[]; series: number[]; total: string }) {
  const ref = useApex(
    () => {
      const c = palette();
      return {
        chart: { type: "donut", height: 230, foreColor: c.text, background: "transparent", fontFamily: "inherit" },
        theme: { mode: c.mode },
        series,
        labels,
        colors: ["#03a9f4", "#71dd37", "#696cff"],
        legend: { show: false },
        dataLabels: { enabled: false },
        stroke: { colors: [isDark() ? "#2b2c40" : "#fff"] },
        plotOptions: { pie: { donut: { size: "62%", labels: { show: true, total: { show: true, label: total } } } } },
      };
    },
    [labels.join(","), series.join(",")],
  );
  return <div ref={ref} className="min-h-[230px]" />;
}
