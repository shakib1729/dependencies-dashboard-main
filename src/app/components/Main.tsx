"use client";

import { useState, ChangeEvent, useMemo } from "react";
import { DataTable } from "../components/ui/data-table";
import { columns } from "../columns";
import { Eye } from "lucide-react";
import { Loading } from "../components/ui/loading";
import "../styles/fonts.css";
import {
  Dependency,
  getTotalOutdatedDependencies,
  getTotalRepetitiveDependencies,
  getTotalSize,
  processData,
} from "@/lib/utils";

export const Main = ({ fileType, uploadText, getData, subText }) => {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [result, setResult] = useState<Dependency[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<string | null>(null);

  const totalSize = useMemo(() => getTotalSize(result), [result]);
  const totalOutdatedDependencies = useMemo(
    () => getTotalOutdatedDependencies(result),
    [result],
  );
  const totalRepetitiveDependencies = useMemo(
    () => getTotalRepetitiveDependencies(result),
    [result],
  );

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile && selectedFile.name.endsWith(fileType)) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        setFileContent(content);
        setSearchResult(content);

        try {
          setLoading(true);
          await analyzeFileContent(content);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsText(selectedFile);
      e.target.value = "";
    } else {
      alert(`Please upload a ${fileType} file`);
    }
  };

  const analyzeFileContent = async (content: string) => {
    try {
      const data = await getData(content);
      const processedData = processData(data);
      setResult(processedData);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setResult(null);
    }
  };

  const togglePopup = () => {
    setIsPopupOpen(!isPopupOpen);
  };

  const handleSearch = (value: string) => {
    if (fileContent) {
      const lines = fileContent.split("\n\n");
      const matchingLines: string[] = [];

      lines.forEach((line) => {
        if (line.toLowerCase().includes(value.toLowerCase())) {
          matchingLines.push(line);
        }
      });

      setSearchResult(matchingLines.join("\n"));
    }
  };

  const resetUpload = () => {
    setFileContent(null);
    setResult(null);
    setSearchResult(null);
    setError(null);
  };

  return (
    <div className={result ? "container-data" : "container-upload"}>
      {!result && !loading && (
        <div className="upload-section">
          <h1 className="header">{uploadText}</h1>
          <label htmlFor="file-upload" className="custom-file-upload">
            Choose File
          </label>
          {subText ? <p className="mt-16 font-normal">{subText}</p> : null}
          <input
            id="file-upload"
            type="file"
            accept={fileType}
            onChange={handleFileChange}
            className="hidden-input"
          />
        </div>
      )}

      {loading && (
        <div style={{ marginTop: "25%" }}>
          <Loading />
        </div>
      )}

      {result && !loading && (
        <>
          <div
            style={{
              padding: "10px",
              backgroundColor: "#FC6736",
              color: "white",
              borderRadius: "5px",
              textAlign: "center",
            }}
          >
            <div className="file-content-toggle">
              <h2 className="sub-header mb-0">Dependency Analysis</h2>
            </div>
            <div>Total Size: {totalSize}</div>
            <div>Outdated Dependencies: {totalOutdatedDependencies}</div>
            <div>Repetitive Dependencies: {totalRepetitiveDependencies}</div>
          </div>
          <div style={{ marginLeft: "10%" }}>
            <div
              className="info-box"
              style={{ backgroundColor: "rgb(254, 202, 202)" }}
              data-tooltip="Outdated based on date & major version"
            ></div>
            <div
              className="info-box"
              style={{ backgroundColor: "rgb(254, 240, 138)" }}
              data-tooltip="Outdated based on date"
            ></div>
            <div
              className="info-box"
              style={{ backgroundColor: "rgb(254, 215, 170)" }}
              data-tooltip="Outdated based on major version"
            ></div>
          </div>
          {error && <div className="error-message">{error}</div> && (
            <button
              onClick={resetUpload}
              style={{
                marginLeft: "10%",
                color: "#0C2D57",
                fontWeight: "bold",
              }}
            >
              Upload Another File
            </button>
          )}

          {!loading && result && Array.isArray(result) && (
            <div className="table-content">
              <div style={{ marginLeft: "10%", color: "#0C2D57" }}>
                <p>
                  *Install Size: The install size represents the total space
                  your hard drive will report after running npm install for a
                  package.
                </p>
                <p>
                  *Publish Size: The publish size is the size of the source code
                  published to npm.
                </p>
              </div>
              <DataTable columns={columns} data={result} />
            </div>
          )}
          {result && (
            <div className="flex justify-end mr-16 gap-3">
              <button onClick={togglePopup} className="eye-button">
                <Eye className="eye-icon" />
              </button>
              <button
                onClick={resetUpload}
                style={{
                  color: "#0C2D57",
                  fontWeight: "bold",
                }}
              >
                Upload Another File
              </button>
            </div>
          )}
        </>
      )}

      {isPopupOpen && (
        <div className="popup-overlay">
          <div className="popup-content">
            <button onClick={togglePopup} className="popup-close-button">
              X
            </button>
            <div>
              <input
                placeholder="Search..."
                onChange={(e) => handleSearch(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="file-content-container">
              <pre>{searchResult}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
