function createNormalFormVisualization() {
    const colors = {
        background: '#000814',
        surface: '#1E1E1E',
        primary: '#BB86FC',
        primaryVariant: '#ffd166',
        secondary: '#ffd166',
        origT1: '#FF6381',
        origT2: '#36A2EB',
        text: {
            dp: '#fefae0',            // This is already set to an off-white color
            primary: '#E1E1E1',
            heading: '#f7fff7',
            subheading: '#fefae0',
            secondary: '#B0B0B0'
        },
        divider: '#2D2D2D'
    };

    const container = d3.select("#visualization-container");
    const width = container.node().clientWidth;
    const height = container.node().clientHeight;
    container.selectAll("*").remove(); // Clear previous visualization

    // Create SVG container
    const svg = container.append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("background-color", colors.background); // Set background color

    // Simple heading
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 40)
      .attr("text-anchor", "middle")
      .attr("font-size", "24px")
      .attr("font-weight", "bold")
      .attr("fill", colors.text.heading) // Set heading text color
      .text("Types of Normal Forms");

    d3.json("http://localhost:8000/api/visualization/normal_form_types")
      .then(data => {
        const normalForms = data.nodes;
        
        const edges = [
            { source: "1NF", target: "2NF" },
            { source: "2NF", target: "3NF" },
            { source: "3NF", target: "BCNF" },
            { source: "BCNF", target: "4NF" },
            { source: "4NF", target: "5NF" }
          ];
          
        // Create a line for each edge
        const link = svg.append("g")
        .selectAll(".link")
        .data(edges)
        .enter()
        .append("line")
        .attr("class", "link")
        .attr("stroke", colors.divider) // Set edge color
        .attr("stroke-width", 2);

        // Force simulation
        const simulation = d3.forceSimulation(normalForms)
          .force("charge", d3.forceManyBody().strength(-300))
          .force("center", d3.forceCenter(width / 2, height / 2))
          .force("collision", d3.forceCollide().radius(50))
          .on("tick", ticked);
  
        // Detail panel dimensions
        const panelWidth = width * 0.8;   // 80% of container width
        const panelHeight = height * 0.8; // 80% of container height
        const panelX = (width - panelWidth) / 2;
        const panelY = (height - panelHeight) / 2;
  
        // ==============
        // DETAIL PANEL
        // ==============
        const detailPanel = svg.append("g")
          .attr("class", "detail-panel")
          .style("fill-opacity", 0.7);
  
        // Background rectangle
        detailPanel.append("rect")
          .attr("width", panelWidth)
          .attr("height", panelHeight)
          .attr("x", panelX)
          .attr("y", panelY)
          .attr("rx", 10)
          .attr("ry", 10)
          .attr("fill", colors.surface) // Set panel background color
          .attr("stroke", colors.divider); // Set panel border color
  
        // Close button (✖) in top-right
        detailPanel.append("text")
        .attr("x", panelX + panelWidth - 15)
        .attr("y", panelY + 20)
        .attr("text-anchor", "end")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .style("cursor", "pointer")
        .attr("fill", colors.text.primary) // Set close button color
        .text("✖")
        .on("click", () => {
          detailPanel.transition()
            .duration(300)
            .style("opacity", 0)
            .on("end", () => {
              // Hide so it won't block clicks
              detailPanel.style("display", "none");
      
              // Unhighlight all circles
              node.selectAll("circle")
                .attr("stroke-width", 2)
                .attr("stroke", colors.divider); // Reset circle stroke color
            });
        });
  
        // Title and description as SVG text
        const detailTitle = detailPanel.append("text")
          .attr("class", "detail-title")
          .attr("x", panelX + panelWidth / 2)
          .attr("y", panelY + 40)
          .attr("text-anchor", "middle")
          .attr("font-size", "18px")
          .attr("font-weight", "bold")
          .attr("fill", colors.text.heading); // Set title text color
  
        const detailDescription = detailPanel.append("text")
          .attr("class", "detail-description")
          .attr("x", panelX + panelWidth / 2)
          .attr("y", panelY + 70)
          .attr("text-anchor", "middle")
          .attr("font-size", "14px")
          .attr("fill", colors.text.dp); // Set description text color
  
        // ==============
        // FOREIGNOBJECT
        // ==============
        const exampleFO = detailPanel.append("foreignObject")
          .attr("x", panelX + 20)
          .attr("y", panelY + 100)
          .attr("width", panelWidth - 40)
          .attr("height", panelHeight - 120);
  
        const exampleContainerDiv = exampleFO
          .append("xhtml:div")
          .style("width", (panelWidth - 40) + "px")
          .style("height", (panelHeight - 120) + "px")
          .style("overflow-y", "auto")
          .style("box-sizing", "border-box");
  
        // Create nodes
        const node = svg.append("g")
          .selectAll(".node")
          .data(normalForms)
          .enter().append("g")
          .attr("class", "node")
          .style("cursor", "pointer")
          .on("click", (event, d) => {
            showDetails(d);
            detailPanel.raise();
          })
          .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));
  
        // Circles
        node.append("circle")
          .attr("r", 30)
          .attr("fill", d => d.color)
          .attr("stroke", colors.divider) // Set circle stroke color
          .attr("stroke-width", 2);
  
        // Labels
        node.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", ".3em")
          .attr("fill", colors.text.primary) // Set label text color
          .attr("font-size", "12px")
          .attr("font-weight", "bold")
          .text(d => d.id);
  
        // Show details
        function showDetails(d) {
            detailPanel.style("display", "block");
            const formId = d.id.trim();
            detailTitle.text(d.name);
            detailDescription.text(d.description);
            exampleContainerDiv.html("");
            createExample(formId, exampleContainerDiv);
            detailPanel.transition()
              .duration(300)
              .style("opacity", 1);
            node.selectAll("circle")
              .attr("stroke-width", n => n.id.trim() === formId ? 4 : 2)
              .attr("stroke", n => n.id.trim() === formId ? colors.primary : colors.divider); // Highlight circle
        }
  
        // Tick
        function ticked() {
            node.attr("transform", d => {
                d.x = Math.max(30, Math.min(width - 30, d.x));
                d.y = Math.max(30, Math.min(height - 30, d.y));
                return `translate(${d.x},${d.y})`;
              });
            
              link
                .attr("x1", d => {
                  const s = normalForms.find(n => n.id.trim() === d.source);
                  return s ? s.x : 0;
                })
                .attr("y1", d => {
                  const s = normalForms.find(n => n.id.trim() === d.source);
                  return s ? s.y : 0;
                })
                .attr("x2", d => {
                  const t = normalForms.find(n => n.id.trim() === d.target);
                  return t ? t.x : 0;
                })
                .attr("y2", d => {
                  const t = normalForms.find(n => n.id.trim() === d.target);
                  return t ? t.y : 0;
                });
        }
  
        // Drag
        function dragstarted(event, d) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        }
  
        function dragged(event, d) {
          d.fx = event.x;
          d.fy = event.y;
        }
  
        function dragended(event, d) {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }
  
        // Initially hidden
        detailPanel.style("opacity", 0);
      })
      .catch(error => {
        console.error("Error loading JSON data:", error);
      });
  
    // ======================================
    // CREATE EXAMPLE (HTML-based tables now)
    // ======================================
    function createExample(normalForm, container) {
      const examples = {
        "1NF": {
          violation: {
            title: "Violation: Non-atomic values",
            table: [
              ["StudentID", "Name", "Phone Numbers"],
              ["1", "John", "555-1234, 555-5678"],
              ["2", "Mary", "555-8765"]
            ]
          },
          fixed: {
            title: "Fixed: Atomic values",
            table: [
              ["StudentID", "Name", "Phone Number"],
              ["1", "John", "555-1234"],
              ["1", "John", "555-5678"],
              ["2", "Mary", "555-8765"]
            ]
          }
        },
        "2NF": {
          violation: {
            title: "Violation: Partial Dependency",
            table: [
              ["StudentID", "CourseID", "StudentName", "Grade"],
              ["1", "CS101", "John", "A"],
              ["1", "MAT101", "John", "B"],
              ["2", "CS101", "Mary", "A-"]
            ]
          },
          fixed: {
            title: "Fixed: No Partial Dependencies",
            tables: [
              {
                title: "Students",
                data: [
                  ["StudentID", "StudentName"],
                  ["1", "John"],
                  ["2", "Mary"]
                ]
              },
              {
                title: "Enrollments",
                data: [
                  ["StudentID", "CourseID", "Grade"],
                  ["1", "CS101", "A"],
                  ["1", "MAT101", "B"],
                  ["2", "CS101", "A-"]
                ]
              }
            ]
          }
        },
        "3NF": {
          violation: {
            title: "Violation: Transitive Dependency",
            table: [
              ["EmployeeID", "DepartmentID", "DepartmentName"],
              ["101", "D1", "HR"],
              ["102", "D1", "HR"],
              ["103", "D2", "IT"]
            ]
          },
          fixed: {
            title: "Fixed: No Transitive Dependencies",
            tables: [
              {
                title: "Employees",
                data: [
                  ["EmployeeID", "DepartmentID"],
                  ["101", "D1"],
                  ["102", "D1"],
                  ["103", "D2"]
                ]
              },
              {
                title: "Departments",
                data: [
                  ["DepartmentID", "DepartmentName"],
                  ["D1", "HR"],
                  ["D2", "IT"]
                ]
              }
            ]
          }
        },
        "BCNF": {
          violation: {
            title: "Violation: Non-key Determinant",
            table: [
              ["StudentID", "Course", "Instructor"],
              ["1", "Math", "Dr. Smith"],
              ["2", "Math", "Dr. Smith"],
              ["3", "Physics", "Dr. Jones"]
            ]
          },
          fixed: {
            title: "Fixed: All Determinants are Keys",
            tables: [
              {
                title: "Courses",
                data: [
                  ["Course", "Instructor"],
                  ["Math", "Dr. Smith"],
                  ["Physics", "Dr. Jones"]
                ]
              },
              {
                title: "Enrollments",
                data: [
                  ["StudentID", "Course"],
                  ["1", "Math"],
                  ["2", "Math"],
                  ["3", "Physics"]
                ]
              }
            ]
          }
        },
        "4NF": {
          violation: {
            title: "Violation: Multi-valued Dependency",
            table: [
              ["StudentID", "Sport", "Musical Instrument"],
              ["1", "Football", "Piano"],
              ["1", "Football", "Guitar"],
              ["1", "Basketball", "Piano"],
              ["1", "Basketball", "Guitar"]
            ]
          },
          fixed: {
            title: "Fixed: No Multi-valued Dependencies",
            tables: [
              {
                title: "Student Sports",
                data: [
                  ["StudentID", "Sport"],
                  ["1", "Football"],
                  ["1", "Basketball"]
                ]
              },
              {
                title: "Student Instruments",
                data: [
                  ["StudentID", "Musical Instrument"],
                  ["1", "Piano"],
                  ["1", "Guitar"]
                ]
              }
            ]
          }
        },
        "5NF": {
          violation: {
            title: "Violation: Join Dependency",
            table: [
              ["Supplier", "Part", "Project"],
              ["S1", "P1", "J1"],
              ["S1", "P1", "J2"],
              ["S2", "P2", "J1"]
            ]
          },
          fixed: {
            title: "Fixed: No Join Dependencies",
            tables: [
              {
                title: "Supplier-Part",
                data: [
                  ["Supplier", "Part"],
                  ["S1", "P1"],
                  ["S2", "P2"]
                ]
              },
              {
                title: "Part-Project",
                data: [
                  ["Part", "Project"],
                  ["P1", "J1"],
                  ["P1", "J2"],
                  ["P2", "J1"]
                ]
              },
              {
                title: "Supplier-Project",
                data: [
                  ["Supplier", "Project"],
                  ["S1", "J1"],
                  ["S1", "J2"],
                  ["S2", "J1"]
                ]
              }
            ]
          }
        }
      };
  
      const example = examples[normalForm];
      if (!example) return;
  
      // Violation
      container.append("p")
        .style("font-weight", "bold")
        .style("margin", "0 0 5px 0")
        .style("color", colors.text.heading) // Changed: Apply off-white color
        .text(example.violation.title);
  
      createHtmlTable(container, example.violation.table);
  
      const fixedData = example.fixed;
      container.append("p")
        .style("font-weight", "bold")
        .style("margin", "20px 0 5px 0")
        .style("color", colors.text.heading) // Changed: Apply off-white color
        .text(fixedData.title);
  
      if (fixedData.tables) {
        fixedData.tables.forEach(tbl => {
          container.append("p")
            .style("font-style", "italic")
            .style("margin", "10px 0 5px 0")
            .style("color", colors.text.subheading) // Changed: Apply off-white color for subheading
            .text(tbl.title);
  
          createHtmlTable(container, tbl.data);
        });
      } else {
        createHtmlTable(container, fixedData.table);
      }
    }
  
    // ======================================
    // CREATE HTML TABLE UTILITY
    // ======================================
    function createHtmlTable(container, data) {
      if (!data || !data.length) return;
  
      const table = container.append("table")
        .style("border-collapse", "collapse")
        .style("margin-bottom", "15px");
  
      // Header row
      const thead = table.append("thead");
      const headerRow = thead.append("tr");
      data[0].forEach(col => {
        headerRow.append("th")
          .style("border", "1px solid #333")
          .style("padding", "5px 10px")
          .style("background", colors.primary) // Set header background color
          .style("color", colors.text.primary) // Set header text color
          .text(col);
      });
  
      // Body rows
      const tbody = table.append("tbody");
      for (let i = 1; i < data.length; i++) {
        const row = tbody.append("tr");
        data[i].forEach(cell => {
          row.append("td")
            .style("border", "1px solid #ccc")
            .style("padding", "5px 10px")
            .style("background", colors.surface) // Set cell background color
            .style("color", colors.text.primary) // Changed: Use primary text color for better visibility
            .text(cell);
        });
      }
    }
  }