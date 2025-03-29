import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const NormalFormVisualization = ({ data }) => {
    const containerRef = useRef(null);

    // 1) Define the examples object at a higher scope
    // so that both showDetails() and createExample() can use it.
    const examples = {
        '1NF': {
            definition: 'A table is in 1NF if it contains no repeating groups.',
            violation: {
                title: 'Violation: Non-atomic values',
                table: [
                    ['StudentID', 'Name', 'Phone Numbers'],
                    ['1', 'John', '555-1234, 555-5678'],
                    ['2', 'Mary', '555-8765']
                ]
            },
            fixed: {
                title: 'Fixed: Atomic values',
                table: [
                    ['StudentID', 'Name', 'Phone Number'],
                    ['1', 'John', '555-1234'],
                    ['1', 'John', '555-5678'],
                    ['2', 'Mary', '555-8765']
                ]
            }
        },
        '2NF': {
            definition: 'A table is in 2NF if it is in 1NF and all non-key attributes are fully dependent on the entire primary key.',
            violation: {
                title: 'Violation: Partial Dependency',
                table: [
                    ['StudentID', 'CourseID', 'StudentName', 'Grade'],
                    ['1', 'CS101', 'John', 'A'],
                    ['1', 'MAT101', 'John', 'B'],
                    ['2', 'CS101', 'Mary', 'A-']
                ]
            },
            fixed: {
                title: 'Fixed: No Partial Dependencies',
                tables: [
                    {
                        title: 'Students',
                        data: [
                            ['StudentID', 'StudentName'],
                            ['1', 'John'],
                            ['2', 'Mary']
                        ]
                    },
                    {
                        title: 'Enrollments',
                        data: [
                            ['StudentID', 'CourseID', 'Grade'],
                            ['1', 'CS101', 'A'],
                            ['1', 'MAT101', 'B'],
                            ['2', 'CS101', 'A-']
                        ]
                    }
                ]
            }
        },
        '3NF': {
            definition: 'A table is in 3NF if it is in 2NF and all non-key attributes are non-transitively dependent on the primary key.',
            violation: {
                title: 'Violation: Transitive Dependency',
                table: [
                    ['EmployeeID', 'DepartmentID', 'DepartmentName'],
                    ['101', 'D1', 'HR'],
                    ['102', 'D1', 'HR'],
                    ['103', 'D2', 'IT']
                ]
            },
            fixed: {
                title: 'Fixed: No Transitive Dependencies',
                tables: [
                    {
                        title: 'Employees',
                        data: [
                            ['EmployeeID', 'DepartmentID'],
                            ['101', 'D1'],
                            ['102', 'D1'],
                            ['103', 'D2']
                        ]
                    },
                    {
                        title: 'Departments',
                        data: [
                            ['DepartmentID', 'DepartmentName'],
                            ['D1', 'HR'],
                            ['D2', 'IT']
                        ]
                    }
                ]
            }
        },
        'BCNF': {
            definition: 'A table is in BCNF if it is in 3NF and for every functional dependency X -> Y, X is a candidate key.',
            violation: {
                title: 'Violation: Non-key Determinant',
                table: [
                    ['StudentID', 'Course', 'Instructor'],
                    ['1', 'Math', 'Dr. Smith'],
                    ['2', 'Math', 'Dr. Smith'],
                    ['3', 'Physics', 'Dr. Jones']
                ]
            },
            fixed: {
                title: 'Fixed: All Determinants are Keys',
                tables: [
                    {
                        title: 'Courses',
                        data: [
                            ['Course', 'Instructor'],
                            ['Math', 'Dr. Smith'],
                            ['Physics', 'Dr. Jones']
                        ]
                    },
                    {
                        title: 'Enrollments',
                        data: [
                            ['StudentID', 'Course'],
                            ['1', 'Math'],
                            ['2', 'Math'],
                            ['3', 'Physics']
                        ]
                    }
                ]
            }
        },
        '4NF': {
            definition: 'A table is in 4NF if it is in BCNF and has no multi-valued dependencies.',
            violation: {
                title: 'Violation: Multi-valued Dependency',
                table: [
                    ['StudentID', 'Sport', 'Musical Instrument'],
                    ['1', 'Football', 'Piano'],
                    ['1', 'Football', 'Guitar'],
                    ['1', 'Basketball', 'Piano'],
                    ['1', 'Basketball', 'Guitar']
                ]
            },
            fixed: {
                title: 'Fixed: No Multi-valued Dependencies',
                tables: [
                    {
                        title: 'Student Sports',
                        data: [
                            ['StudentID', 'Sport'],
                            ['1', 'Football'],
                            ['1', 'Basketball']
                        ]
                    },
                    {
                        title: 'Student Instruments',
                        data: [
                            ['StudentID', 'Musical Instrument'],
                            ['1', 'Piano'],
                            ['1', 'Guitar']
                        ]
                    }
                ]
            }
        },
        '5NF': {
            definition: 'A table is in 5NF if it is in 4NF and cannot be decomposed into smaller tables without losing information.',
            violation: {
                title: 'Violation: Join Dependency',
                table: [
                    ['Supplier', 'Part', 'Project'],
                    ['S1', 'P1', 'J1'],
                    ['S1', 'P1', 'J2'],
                    ['S2', 'P2', 'J1']
                ]
            },
            fixed: {
                title: 'Fixed: No Join Dependencies',
                tables: [
                    {
                        title: 'Supplier-Part',
                        data: [
                            ['Supplier', 'Part'],
                            ['S1', 'P1'],
                            ['S2', 'P2']
                        ]
                    },
                    {
                        title: 'Part-Project',
                        data: [
                            ['Part', 'Project'],
                            ['P1', 'J1'],
                            ['P1', 'J2'],
                            ['P2', 'J1']
                        ]
                    },
                    {
                        title: 'Supplier-Project',
                        data: [
                            ['Supplier', 'Project'],
                            ['S1', 'J1'],
                            ['S1', 'J2'],
                            ['S2', 'J1']
                        ]
                    }
                ]
            }
        }
    };

    useEffect(() => {
        // Basic validation
        if (!data || !data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0 ||
            !data.edges || !Array.isArray(data.edges)) {
            console.error('Invalid data format for Normal Form visualization');
            return;
        }

        const container = d3.select(containerRef.current);
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        // Clear old content
        container.selectAll('*').remove();

        // Colors
        const colors = {
            background: '#000814',
            surface: '#1E1E1E',
            primary: '#BB86FC',
            primaryVariant: '#ffd166',
            secondary: '#ffd166',
            origT1: '#FF6381',
            origT2: '#36A2EB',
            text: {
                dp: '#fefae0',
                primary: '#E1E1E1',
                heading: '#f7fff7',
                subheading: '#fefae0',
                secondary: '#B0B0B0'
            },
            divider: '#2D2D2D'
        };

        // Create SVG
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('background-color', colors.background);

        // Heading
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', 40)
            .attr('text-anchor', 'middle')
            .attr('font-size', '24px')
            .attr('font-weight', 'bold')
            .attr('fill', colors.text.heading)
            .text('Types of Normal Forms');

        // Extract nodes and edges
        const normalForms = data.nodes;
        const edges = data.edges;

        // Links
        const linkGroup = svg.append('g').attr('class', 'links');
        const link = linkGroup.selectAll('.link')
            .data(edges)
            .enter()
            .append('line')
            .attr('class', 'link')
            .attr('stroke', colors.divider)
            .attr('stroke-width', 2);

        // Force Simulation
        const simulation = d3.forceSimulation(normalForms)
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(50))
            .on('tick', ticked);

        // Detail Panel
        const panelWidth = width * 0.6;
        const panelHeight = height * 0.6;
        const panelX = (width - panelWidth) / 2;
        const panelY = (height - panelHeight) / 2;

        const detailPanel = svg.append('g')
            .attr('class', 'detail-panel')
            .style('fill-opacity', 0.7);

        detailPanel.append('rect')
            .attr('width', panelWidth)
            .attr('height', panelHeight)
            .attr('x', panelX)
            .attr('y', panelY)
            .attr('rx', 10)
            .attr('ry', 10)
            .attr('fill', colors.surface)
            .attr('stroke', colors.divider);

        detailPanel.append('text')
            .attr('x', panelX + panelWidth - 20)
            .attr('y', panelY + 20)
            .attr('text-anchor', 'end')
            .attr('font-size', '16px')
            .attr('font-weight', 'bold')
            .style('cursor', 'pointer')
            .attr('fill', colors.text.primary)
            .text('✖')
            .on('click', () => {
                detailPanel.transition()
                    .duration(300)
                    .style('opacity', 0)
                    .on('end', () => {
                        detailPanel.style('display', 'none');
                        nodeSelection.selectAll('circle')
                            .attr('stroke-width', 2)
                            .attr('stroke', colors.divider);
                    });
            });

        const detailTitle = detailPanel.append('text')
            .attr('class', 'detail-title')
            .attr('x', panelX + panelWidth / 2)
            .attr('y', panelY + 40)
            .attr('text-anchor', 'middle')
            .attr('font-size', '18px')
            .attr('font-weight', 'bold')
            .attr('fill', colors.text.heading);

        const detailDescription = detailPanel.append('text')
            .attr('class', 'detail-description')
            .attr('x', panelX + panelWidth / 2)
            .attr('y', panelY + 70)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('fill', colors.text.dp);

        const exampleFO = detailPanel.append('foreignObject')
            .attr('x', panelX + 20)
            .attr('y', panelY + 100)
            .attr('width', panelWidth - 40)
            .attr('height', panelHeight - 120);

        const exampleContainerDiv = exampleFO
            .append('xhtml:div')
            .style('width', `${panelWidth - 40}px`)
            .style('height', `${panelHeight - 120}px`)
            .style('overflow-y', 'auto')
            .style('box-sizing', 'border-box');

        // Nodes
        const nodeGroup = svg.append('g').attr('class', 'nodes');
        const nodeSelection = nodeGroup.selectAll('.node')
            .data(normalForms)
            .enter()
            .append('g')
            .attr('class', 'node')
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                showDetails(d);
                detailPanel.raise();
            })
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended)
            );

        nodeSelection.append('circle')
            .attr('r', 30)
            .attr('fill', d => d.color || colors.primary)
            .attr('stroke', colors.divider)
            .attr('stroke-width', 2);

        nodeSelection.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '.3em')
            .attr('fill', colors.text.subheading)
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .text(d => d.id);

        detailPanel.style('opacity', 0);

        // ==================
        // HELPER FUNCTIONS
        // ==================
        function ticked() {
            nodeSelection.attr('transform', d => {
                d.x = Math.max(30, Math.min(width - 30, d.x));
                d.y = Math.max(30, Math.min(height - 30, d.y));
                return `translate(${d.x},${d.y})`;
            });

            link
                .attr('x1', d => {
                    const source = normalForms.find(n => n.id.trim() === d.source);
                    return source ? source.x : 0;
                })
                .attr('y1', d => {
                    const source = normalForms.find(n => n.id.trim() === d.source);
                    return source ? source.y : 0;
                })
                .attr('x2', d => {
                    const target = normalForms.find(n => n.id.trim() === d.target);
                    return target ? target.x : 0;
                })
                .attr('y2', d => {
                    const target = normalForms.find(n => n.id.trim() === d.target);
                    return target ? target.y : 0;
                });
        }

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

        // Show detail panel
        function showDetails(d) {
            detailPanel.style('display', 'block');

            const formId = d.id.trim();
            detailTitle.text(d.name || formId);

            // 2) If we have a definition in our examples, use that; otherwise, fallback to node description
            const exampleObj = examples[formId];
            if (exampleObj && exampleObj.definition) {
                detailDescription.text(exampleObj.definition);
            } else {
                // fallback to the node's own description, if any
                detailDescription.text(d.description || '');
            }

            // Clear old HTML content
            exampleContainerDiv.html('');

            // 3) Populate the violation/fix examples
            createExample(formId, exampleContainerDiv);

            detailPanel.transition()
                .duration(300)
                .style('opacity', 1);

            // Highlight selected node
            nodeSelection.selectAll('circle')
                .attr('stroke-width', n => n.id.trim() === formId ? 4 : 2)
                .attr('stroke', n => n.id.trim() === formId ? colors.primary : colors.divider);
        }

        // 4) Populate violation/fix from examples
        function createExample(normalForm, container) {
            const example = examples[normalForm];
            if (!example) return;

            // Show violation
            container.append('p')
                .style('font-weight', 'bold')
                .style('margin', '0 0 5px 0')
                .style('color', colors.text.heading)
                .text(example.violation.title);

            createHtmlTable(container, example.violation.table);

            // Show fix
            const fixedData = example.fixed;
            container.append('p')
                .style('font-weight', 'bold')
                .style('margin', '20px 0 5px 0')
                .style('color', colors.text.heading)
                .text(fixedData.title);

            if (fixedData.tables) {
                fixedData.tables.forEach(tbl => {
                    container.append('p')
                        .style('font-style', 'italic')
                        .style('margin', '10px 0 5px 0')
                        .style('color', colors.text.subheading)
                        .text(tbl.title);

                    createHtmlTable(container, tbl.data);
                });
            } else {
                createHtmlTable(container, fixedData.table);
            }
        }

        // Helper to create tables
        function createHtmlTable(container, tableData) {
            if (!tableData || !tableData.length) return;

            const table = container.append('table')
                .style('border-collapse', 'collapse')
                .style('margin-bottom', '15px');

            // Header
            const thead = table.append('thead');
            const headerRow = thead.append('tr');
            tableData[0].forEach(col => {
                headerRow.append('th')
                    .style('border', '1px solid #333')
                    .style('padding', '5px 10px')
                    .style('background', colors.primary)
                    .style('color', colors.text.primary)
                    .text(col);
            });

            // Body
            const tbody = table.append('tbody');
            for (let i = 1; i < tableData.length; i++) {
                const row = tbody.append('tr');
                tableData[i].forEach(cell => {
                    row.append('td')
                        .style('border', '1px solid #ccc')
                        .style('padding', '5px 10px')
                        .style('background', colors.surface)
                        .style('color', colors.text.primary)
                        .text(cell);
                });
            }
        }

    }, [data]);

    return (
        <div
            ref={containerRef}
            style={{ 
                width: '100%', 
                height: '100%', 
                minHeight: '650px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#1a202c',
                color: 'white'
              }}
        />
    );
};

export default NormalFormVisualization;
