import {APGBox} from '../box.js'
import * as DS from '../data_structures/graph.js'

export class ExampleGraph extends APGBox {
  constructor () {
    super()
    this.newOutputPlug('graph')
    this.scheduleProcessing(() => {
      let g = new DS.Graph()
      g.addNode('tl', 0, 0)
       .addNode('tr', 100, 0)
       .addNode('bl', 0, 100)
       .addNode('br', 100, 100)
       .addEdge(null, 'tl', 'br')
       .addEdge(null, 'tr', 'bl')
      this.output.graph.write(g)
    })
  }

  static metadata () {
    return {category: 'graph', name: 'example_graph'}
  }
}

export class Graph extends APGBox {
  constructor () {
    super()
    this.newInputPlug('graph', this.replaceGraph)
    this.newOutputPlug('graph')
    this.state = {graph: new DS.Graph()}
    this.scheduleProcessing(() => this.output.graph.write(this.state.graph))
  }

  static metadata () {
    return {category: 'graph', name: 'graph'}
  }

  replaceGraph () {
    this.state.graph = this.input.graph.copy()
    this.output.graph.write(this.state.graph)
  }

  createLayout () {
    let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', 320)
    svg.setAttribute('height', 240)
    svg.classList.add('Graph-svg')
    svg.style.border = '1px solid black'

    let d3svg = d3.select(svg)
    d3svg.call(d3.zoom().on('zoom', () => {
      d3svg.selectAll('.Graph-graph').attr('transform', d3.event.transform)
    }))

    d3svg.append('circle')
        .attr('r', 4.5)
        .classed('Graph-graph', true)
        .classed('Graph-ghost-node', true)
        .style('visibility', 'hidden')

    d3svg.append('defs')
      .append('marker')
        .attr('id', 'arrow-end')
        .attr('markerUnits', 'strokeWidth')
        .attr('markerWidth', 10)
        .attr('markerHeight', 5)
        .attr('refX', 6)
        .attr('refY', 0.5)
        .attr('orient', 'auto')
      .append('path')
        .attr('d', 'M1,0.2 L1,0.8 L4,0.5 z')
    return svg
  }

  render (node) {
    let svg = d3.select(node).select('svg')
    let [nodes_data, edges_data] = this.state.graph.flatten()

    // get current zoom transform of the svg to apply to all nodes/edges
    let zoom = d3.zoomTransform(svg.node())

    svg.on('dblclick', () => {
      if (d3.event.ctrlKey) {
        let [x, y] = d3.zoomTransform(svg.node()).invert(
          [d3.event.offsetX, d3.event.offsetY]
        )
        this.scheduleProcessing(() => {
          this.state.graph.addNode(null, x, y)
          this.output.graph.write(this.state.graph)
        })
      }
    })

    svg.selectAll('.Graph-edge')
      .data(edges_data)
      .join('line')
        .classed('Graph-graph', true)
        .classed('Graph-edge', true)
        .attr('x1', (d) => d.from.x)
        .attr('y1', (d) => d.from.y)
        .attr('x2', (d) => d.to.x)
        .attr('y2', (d) => d.to.y)
        .attr('transform', zoom)
        .attr('marker-end', this.state.graph.directed ? 'url(#arrow-end)' : null)
        .on('click', (d) => {
          if (d3.event.altKey) {
            this.scheduleProcessing(() => {
              this.state.graph.deleteEdge(d.name)
              this.output.graph.write(this.state.graph)
            })
          }
        })

    let newEdgeFrom = null
    svg.selectAll('.Graph-node')
      .data(nodes_data)
      .join('circle')
        .attr('r', 4.5)
        .classed('Graph-graph', true)
        .classed('Graph-node', true)
        .classed('Graph-moving', false)
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y)
        .attr('transform', zoom)
        .raise()
        .on('click', (d) => {
          if (d3.event.altKey) {
            this.scheduleProcessing(() => {
              this.state.graph.deleteNode(d.name)
              this.output.graph.write(this.state.graph)
            })
          } else if (d3.event.ctrlKey) {
            if (newEdgeFrom === null) {
              newEdgeFrom = d.name
              d3.select(d3.event.target).classed('Graph-moving', true)
            } else {
              if (newEdgeFrom !== d.name) {
                let newEdge = [newEdgeFrom, d.name]
                this.scheduleProcessing(() => {
                  this.state.graph.addEdge(null, newEdge[0], newEdge[1])
                  this.output.graph.write(this.state.graph)
                })
              }
              newEdgeFrom = null
              // this only works when cancelling a new edge, not when actually
              // creating one, but that's okay, because creating a new edge
              // schedules processing, which causes a rerender.
              d3.select(d3.event.target).classed('Graph-moving', false)
            }
          }
        })
        .call(d3.drag()
          .filter(() => !d3.event.altKey && !d3.event.ctrlKey && !d3.event.button)
          .on('start', (d) => {
            let node = d3.select(d3.event.sourceEvent.target)
            node.classed('Graph-moving', true)
            ghost.style('visibility', 'visible')
                .attr('cx', d.x)
                .attr('cy', d.y)
          })
          .on('drag', (d) => {
            // d3-drag's fancy coordinate computations (in d3.event.{x,y})
            // don't play very well with zooming
            let [x, y] = d3.zoomTransform(svg.node()).invert([
              d3.event.sourceEvent.offsetX,
              d3.event.sourceEvent.offsetY,
            ])
            ghost.attr('cx', x).attr('cy', y)
          })
          .on('end', (d) => {
            let [x, y] = d3.zoomTransform(svg.node()).invert([
              d3.event.sourceEvent.offsetX,
              d3.event.sourceEvent.offsetY,
            ])
            ghost.style('visibility', 'hidden')
            this.scheduleProcessing(() => {
              this.state.graph.moveNode(d.name, x, y)
              this.output.graph.write(this.state.graph)
            })
          })
        )

    let ghost = svg.select('.Graph-ghost-node').raise()
  }
}
