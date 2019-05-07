import { json } from 'd3-request';

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
                                properties (keys: ["type", "title", "_key"]) {
                                    key
                                    value
                                }
                            }
                        }
                    }
                    properties (keys: ["type", "name"]) {
                        key
                        value
                    }
                }
            }
        }`
    });

    const graph = await new Promise((resolve, reject) => {
        json('/multinet/graphql')
            .post(query, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(result);
            });
    });

    const author = graph.data.nodes.nodes[0];

    const props = (() => {
        let p = {};
        author.properties.forEach(prop => {
            p[prop.key] = prop.value
        });
        return p;
    })();

    const authorData = {
        graphDegree: author.incoming.total,
        label: 'Author',
        title: props.name,
        uuid: author.key.split('/')[1]
    };

    const makeLink = (link) => {
        const props = (() => {
            let p = {};
            link.source.properties.forEach(prop => {
                p[prop.key] = prop.value;
            });
            return p;
        })();

        return {
            source: authorData,
            target: {
                graphDegree: link.source.outgoing.total,
                label: 'Article',
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

export async function getNodeTree(graph, db, root, includeRoot) {
    let url = `api/data_api/graph/${db}`;
    if (root) {
        url += `/${encodeURIComponent(root)}/${includeRoot.toString()}`;
    }

    const body = JSON.stringify({
        treeNodes: graph ? graph.nodes.map((n) => n.uuid) : ['']
    });

    const result = await new Promise((resolve, reject) => {
        json(url)
            .header('Content-Type', 'application/json')
            .post(body, (error, graph) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(graph);
            });
    });

    return result;
}

export async function getNodes(selectedDB, graph, info) {
    console.log('getNodes()');

    const url = `api/data_api/getNodes/${selectedDB}`;

    const postContent = JSON.stringify({
        rootNode: '',
        rootNodes: info.children.map((n) => n.uuid),
        treeNodes: graph.nodes.map((n) => n.uuid)
    });

    const result = await new Promise((resolve, reject) => {
        json(url)
            .header('Content-Type', 'application/json')
            .post(postContent, (error, graph) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(graph);
            });
    });

    return result;
}

export async function getProperty(db, name, graph) {
    console.log('getProperty()');

    const url = 'api/data_api/property/' + db + '/' + name;
    const postContent = JSON.stringify({ 'treeNodes': graph ? graph.nodes.map((n) => { return n.uuid; }) : [''] });

    const result = await new Promise((resolve, reject) => {
        json(url)
            .header('Content-Type', 'application/json')
            .post(postContent, (error, data) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(data);
            });
    });

    return result;
}

export async function getLabels(db) {
    console.log('getLabels()');

    const url = `api/data_api/labels/${db}`;

    const result = await new Promise((resolve, reject) => {
        json(url, (error, data) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(data);
        });
    });

    return result;
}

export async function getEdges(db, uuid, nodes) {
    console.log('getEdges()');

    const url = `api/data_api/edges/${db}/${encodeURIComponent(uuid)}`;

    const postContent = JSON.stringify({
        treeNodes: nodes
    });

    const result = await new Promise((resolve, reject) => {
        json(url)
            .header('Content-Type', 'application/json')
            .post(postContent, (error, data) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(data);
            });
    });

    return result;

}
