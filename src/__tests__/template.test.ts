/**
 * Tests for template utility functions
 */

import { extractVariables, fillTemplate } from "../models/template";

describe("extractVariables", () => {
  it("should extract single variable from template", () => {
    const content = "請分析 {{股票代號}} 的基本面";
    const result = extractVariables(content);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("股票代號");
  });

  it("should extract multiple variables", () => {
    const content =
      "請分析 {{股票代號}} ({{股票名稱}}) 的基本面，目標價格 {{目標價格}}";
    const result = extractVariables(content);

    expect(result).toHaveLength(3);
    expect(result.map((v) => v.name)).toEqual(
      expect.arrayContaining(["股票代號", "股票名稱", "目標價格"])
    );
  });

  it("should handle duplicate variables", () => {
    const content = "{{股票代號}} 的價格是多少？{{股票代號}} 的營收如何？";
    const result = extractVariables(content);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("股票代號");
  });

  it("should handle variables with spaces", () => {
    const content = "請分析 {{ 股票代號 }} 的基本面";
    const result = extractVariables(content);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("股票代號");
  });

  it("should return empty array for no variables", () => {
    const content = "這是一個沒有變數的模板";
    const result = extractVariables(content);

    expect(result).toHaveLength(0);
  });

  it("should handle empty string", () => {
    const content = "";
    const result = extractVariables(content);

    expect(result).toHaveLength(0);
  });
});

describe("fillTemplate", () => {
  it("should fill single variable", () => {
    const content = "請分析 {{股票代號}} 的基本面";
    const values = { 股票代號: "2330" };
    const result = fillTemplate(content, values);

    expect(result).toBe("請分析 2330 的基本面");
  });

  it("should fill multiple variables", () => {
    const content = "請分析 {{股票代號}} ({{股票名稱}}) 的基本面";
    const values = { 股票代號: "2330", 股票名稱: "台積電" };
    const result = fillTemplate(content, values);

    expect(result).toBe("請分析 2330 (台積電) 的基本面");
  });

  it("should keep unfilled variables", () => {
    const content = "請分析 {{股票代號}} 的基本面";
    const values = {};
    const result = fillTemplate(content, values);

    expect(result).toBe("請分析 {{股票代號}} 的基本面");
  });

  it("should handle partial fill", () => {
    const content = "請分析 {{股票代號}} ({{股票名稱}}) 的基本面";
    const values = { 股票代號: "2330" };
    const result = fillTemplate(content, values);

    expect(result).toBe("請分析 2330 ({{股票名稱}}) 的基本面");
  });

  it("should handle empty values", () => {
    const content = "請分析 {{股票代號}} 的基本面";
    const values = { 股票代號: "" };
    const result = fillTemplate(content, values);

    expect(result).toBe("請分析  的基本面");
  });

  it("should handle variables with spaces in placeholder", () => {
    const content = "請分析 {{ 股票代號 }} 的基本面";
    const values = { 股票代號: "2330" };
    const result = fillTemplate(content, values);

    expect(result).toBe("請分析 2330 的基本面");
  });
});
