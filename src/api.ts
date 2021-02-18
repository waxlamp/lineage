import { json } from 'd3-request';

function promisifyGet (url): Promise<any> {
    return new Promise((resolve, reject) => {
        json(url, (error, data) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(data);
        });
    });
}

function promisifyPost (url, postContent) {
    return new Promise((resolve, reject) => {
        json(url)
            .header('Content-Type', 'application/json')
            .post(JSON.stringify(postContent), (error, data) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(data);
            });

    });
}

function graphql (query): Promise<{data: any, errors: Array<any>}> {
    return promisifyPost('/multinet/graphql', {
        query
    });
}

export async function getNode (nodeId) {
    const query = JSON.stringify({
        query: `query {
            nodes (workspace: "dblp", graph: "coauth", nodeType: "author", key: "author/${nodeId}") {
                total
                nodes {
                    key
                    type
                    incoming {
                        total
                        edges (limit: 20) {
                            source {
                                outgoing {
                                  total
                                }
                                properties (keys: ["type", "title", "label", "_key"]) {
                                    key
                                    value
                                }
                            }
                        }
                    }
                    properties (keys: ["type", "name", "label"]) {
                        key
                        value
                    }
                }
            }
        }`
    });

    const graph = await graphql(query);
    console.log('graph', graph);

    const author = graph.data.nodes.nodes[0];

    const props: {label: string, name: string} = (() => {
        let p: any = {};
        author.properties.forEach(prop => {
            p[prop.key] = prop.value
        });
        return p;
    })();

    const authorData = {
        graphDegree: author.incoming.total,
        label: props.label,
        title: props.name,
        uuid: author.key.split('/')[1]
    };

    const makeLink = (link) => {
        const props: {label: string, title: string, _key: string} = (() => {
            let p: any = {};
            link.source.properties.forEach(prop => {
                p[prop.key] = prop.value;
            });
            return p;
        })();

        return {
            source: authorData,
            target: {
                graphDegree: link.source.outgoing.total,
                label: props.label,
                title: props.title,
                uuid: props._key
            }
        };
    };

    const links = author.incoming.edges.map(makeLink);
    const targetNodes = links.map(l => l.target);

    return {
        nodes: [authorData],
        links,
        root: [author.key.split('/')[1]],
        targetNodes
    };
}

export function getNodeTreeMN() {
    throw new Error("undefined");
}

export function getNodeTree(graph, db, root, includeRoot) {
    let url = `api/data_api/graph/${db}`;
    if (root) {
        url += `/${encodeURIComponent(root)}/${includeRoot.toString()}`;
    }

    return promisifyPost(url, {
        treeNodes: graph ? graph.nodes.map((n) => n.uuid) : ['']
    });
}

interface NodesResponse {
    links: Array<{
        edge: any
        source: any
        target: any
    }>
    nodes: Array<{
        graphData: any
        graphDegree: number
        label: string
        title: string
        uuid: string
    }>
    params: {
        rootNode: string
        rootNodes: Array<string>
        treeNodes: Array<string>
    }
    root: Array<string>
}

export function getNodesMN(): NodesResponse {
    throw new Error("undefined");
}

export function getNodes(selectedDB, graph, info): Promise<NodesResponse> {
    console.log('getNodes()');

    return promisifyPost(`api/data_api/getNodes/${selectedDB}`, {
        rootNode: '',
        rootNodes: info.children.map((n) => n.uuid),
        treeNodes: graph.nodes.map((n) => n.uuid)
    });
}

interface PropertyResponse {
    query?: string
    results: Array<{
        label: Array<string>
        prop: string
        uuid: string
        value: string
    }>
}

export function getPropertyMN(): PropertyResponse {
    throw new Error("undefined");
}

export function getProperty(db, name, graph): Promise<PropertyResponse> {
    console.log('getProperty()');

    return promisifyPost(`api/data_api/property/${db}/${name}`, {
        treeNodes: graph ? graph.nodes.map((n) => { return n.uuid; }) : ['']
    });
}

interface Property {
    property: string
    label: string
}

interface PropertiesResponse {
    properties: Array<Property>
}

export async function getPropertiesMN(workspace, graph, nodeTypes): Promise<PropertiesResponse> {
    console.log('getPropertiesMN()');

    let allNodes = [];
    for (let i = 0; i < nodeTypes.length; i++) {
        const nodeType = nodeTypes[i];

        let offset = 0;
        const limit = 20;

        let done = false;
        while (!done) {
            const query = `query {
                nodes (workspace: "${workspace}", graph: "${graph}", nodeType: "${nodeType}") {
                    total
                    nodes (offset: ${offset}, limit: ${limit}) {
                        properties {
                            key
                            value
                        }
                    }
                }
            }`;

            const nodes = await graphql(query);

            allNodes = allNodes.concat(nodes.data.nodes.nodes.map(n => n.properties));

            offset += nodes.data.nodes.nodes.length;
            if (offset >= 20) {
            //if (offset >= nodes.data.nodes.total) {
                done = true;
            }
        }
    }

    // Collect unique property/label pairs.
    let properties = {};
    allNodes.forEach((node) => {
        let label;
        let props = {};
        node.forEach(({key, value}) => {
            if (key[0] === '_' || key === 'type') {
                return;
            } else if (key === 'label') {
                label = value;
            } else {
                props[key] = value;
            }
        });

        if (!properties[label]) {
            properties[label] = new Set();
        }

        Object.keys(props).forEach((prop) => {
            properties[label].add(prop);
        });
    });

    // Unfold the sets into the format expected by Juniper.
    let proplist = [];
    Object.keys(properties).forEach((label) => {
        Array.from(properties[label]).forEach((property) => {
            proplist.push({
                property,
                label
            });
        });
    });

    return {
        properties: proplist
    };
}

export function getProperties(db): Promise<PropertiesResponse> {
    console.log('getProperties()');

    return promisifyGet(`api/data_api/properties/${db}`);
}

export async function getLabelsMN(workspace, graph, nodeTypes) {
    let allNodes = [];
    for (let i = 0; i < nodeTypes.length; i++) {
        const nodeType = nodeTypes[i];

        let offset = 0;
        const limit = 20;

        let done = false;
        while (!done) {
            const query = `query {
                nodes (workspace: "${workspace}", graph: "${graph}", nodeType: "${nodeType}") {
                    total
                    nodes (offset: ${offset}, limit: ${limit}) {
                        incoming {
                            total
                        }
                        outgoing {
                            total
                        }
                         properties (keys: ["_key", "name", "title", "label"]) {
                            key
                            value
                        }
                    }
                }
            }`;

            const nodes = await graphql(query);

            allNodes = allNodes.concat(nodes.data.nodes.nodes);

            offset += nodes.data.nodes.nodes.length;
            if (offset >= 20) {
            //if (offset >= nodes.data.nodes.total) {
                done = true;
            }
        }
    }

    // Partition the results by their labels.
    let labels = {};
    allNodes.forEach((node) => {
        let props: any = {};
        node.properties.forEach((prop) => {
            if (prop.key === "label") {
                if (prop.value.startsWith('chi')) {
                    prop.value = 'CHI';
                } else if (prop.value === 'tvcg') {
                    prop.value = 'TVCG';
                }
            }

            props[prop.key] = prop.value;
        });

        if (!labels[props.label]) {
            labels[props.label] = {
                name: props.label,
                nodes: []
            };
        }

        labels[props.label].nodes.push({
            id: props._key,
            title: props.title || props.name,
            degree: node.incoming.total + node.outgoing.total
            //degree: 4
        });
    });

    const retval = {
        labels: Object.values(labels)
    };

    console.log('getLabelsMN()', retval);

    return retval;
}

export function getLabels(db) {
    console.log('getLabels()');

    return promisifyGet(`api/data_api/labels/${db}`);
}

export function getEdgesMN() {
    throw new Error("undefined");
}

export function getEdges(db, uuid, nodes) {
    console.log('getEdges()');

    return promisifyPost(`api/data_api/edges/${db}/${encodeURIComponent(uuid)}`, {
        treeNodes: nodes
    });
}

export interface LabelNode {
    id: string
    degree: number
    title: string
}

interface FilterResponse {
    labels: Array<{
        name: string
        nodes: Array<LabelNode>
    }>
    query?: string
}

export function filterMN(): FilterResponse {
    throw new Error("undefined");
}

export function filter(db, search): Promise<FilterResponse> {
    console.log('filter()');

    return promisifyPost(`api/data_api/filter/${db}`, {
        searchString: search
    });
}

export function queryMN(): FilterResponse {
    throw new Error("undefined");
}

export function query(db, search): Promise<FilterResponse> {
    console.log('query()');

    return promisifyPost(`api/data_api/query/${db}`, {
        searchString: search
    });
}
