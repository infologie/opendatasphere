var network = {
    container: document.querySelector('#network'),
    data: {
        nodes: new vis.DataSet(),
        edges: new vis.DataSet()
    },
    options: {
        physics: {
            enabled: true,
            repulsion: {
                centralGravity: 0.0,
                springLength: 350,
                springConstant: 0.01,
                nodeDistance: 400,
                damping: 0.09
            },
            solver: 'repulsion'
        },
        edges: {
            width: 2,
            selectionWidth: 6,
            smooth: {
                type: 'horizontal',
                forceDirection: 'horizontal'
            }
        },
        groups: {
            personne: {shape: 'image', color: {border: chooseColor('personne')}},
            organisme_public: {shape: 'image', color: {border: chooseColor('organisme_public')}},
            organisme_prive: {shape: 'image', color: {border: chooseColor('organisme_prive')}},
            outil: {shape: 'image', color: {border: chooseColor('opposant')}}
        },
        interaction: {hover:true}
    },
    zoom: {
        max: 1,
        min: 0.2
    },
    selectedNode: undefined,

    init: function() {
        
        // Génération de la visualisation
        network.visualisation = new vis.Network(network.container,
            network.data, network.options);
        
        // Évents du network
        network.visualisation.on('selectNode', function(nodeMetasBrutes) {
            var idNode = nodeMetasBrutes.nodes[0];
        
            if (idNode === undefined) { return; }
            
            if (network.selectedNode !== undefined && network.selectedNode == idNode) {
                // si nœud est déjà selectionné
                return;
            }
        
            switchNode(idNode);
            historique.actualiser(idNode);
        });
        
        network.visualisation.on('hoverNode', function(params) {
            var idNodeHovered = params.node;
        
            // pas d'effet sur le nœud survolé
            var noEffectNodesIds = [idNodeHovered];
            // ni sur les nœuds qui y sont connectés
            noEffectNodesIds = noEffectNodesIds
                .concat(network.visualisation.getConnectedNodes(idNodeHovered));
        
            if (network.selectedNode !== undefined) {
                // pas d'effet sur le nœud selectionné
                noEffectNodesIds.push(network.selectedNode)
                // ni sur les nœuds qui y sont connectés
                noEffectNodesIds = noEffectNodesIds
                    .concat(network.visualisation.getConnectedNodes(network.selectedNode));
            }

            network.data.nodes.update(
                network.data.nodes.map(entite => ({
                    id: entite.id,
                    color: chooseColor(entite.group, true),
                    opacity: 0.4,
                    font: {
                        color: 'rgba(255, 255, 255, 0.5)',
                        strokeColor: 'rgba(0, 0, 0, 0.5)'
                    }
                } ), {
                    filter: function(entite) {
                        return(noEffectNodesIds.includes(entite.id) == false);
                    }
                })
            );
            
        });
        
        network.visualisation.on('blurNode', function() {

            network.data.nodes.update(
                network.data.nodes.map(entite => ({
                        id: entite.id,
                        color: false,
                        opacity: 1,
                        font: {
                            color: '#fff',
                            strokeColor: '#000'
                        }
                } ))
            );
        });
        
        network.visualisation.on('zoom', function(params) {
        
            // limiter le de-zoom
            if (params.scale <= network.zoom.min) {
                network.visualisation.moveTo({
                    position: { x: 0, y: 0 },
                    scale: network.zoom.min
                });
            }
        
            // limiter le zoom
            if (params.scale >= network.zoom.max) {
                network.visualisation.moveTo({ scale: network.zoom.max }); }
        });

        zoom.btnPlus.addEventListener('click', zoomIn);
        zoom.btnMoins.addEventListener('click', zoomOut);
        zoom.btnReinitialiser.addEventListener('click', backToCenterView);
        
        board.init();
        search.input.addEventListener('focus', search.init);
        filter.init();
        
        // Si l'id d'un nœud est entré dans l'URL, on l'active
        const urlPathnameArray = window.location.pathname.split('/');
        const nodeId = urlPathnameArray[urlPathnameArray.length -1];
        if (switchNode(nodeId, false)) {
            historique.init(nodeId);
        }
    }
}

/**
 * Retourne une couleur type RGB ou RGBA
 * selon le nom d'un groupe d'entité
 * @param {String} relationEntite 
 * @param {Boolean} [lowerOpacity = false] true : retuns RGBA : false : retuns RGB
 * @returns {String}
 */

function chooseColor(relationEntite, lowerOpacity = false) {
    switch (relationEntite) {
        case 'personne':
            var color = '154, 60, 154'; break;
        case 'organisme_public':
            var color = '97, 172, 97'; break;
        case 'organisme_prive':
            var color = '250, 128, 114'; break;
        case 'outil':
            var color = '102, 179, 222'; break;
    }
    if (lowerOpacity) { return ['rgba(', color, ', 0.4)'].join(''); }
    else { return ['rgb(', color, ')'].join(''); }
}

function getNodeMetas(id) { 
    var nodeMetas = false;

    network.data.nodes.get({

        filter: function (item) {
            if (item.id == id) {
                nodeMetas = item; }
        }
    });

    return nodeMetas;
}

function findConnectedNodes(nodeId) {
    var nodesConnected = network.visualisation.getConnectedNodes(nodeId);
    var edgesConnected = network.visualisation.getConnectedEdges(nodeId);

    var connectedNodesList = [];
    for (let i = 0; i < nodesConnected.length; i++) {
        const id = nodesConnected[i];
        var nodeMetas = getNodeMetas(id);
        var nodeLinkTitle = network.data.edges.get(edgesConnected[i]).title;
        connectedNodesList.push({
            id: nodeMetas.id,
            label: nodeMetas.label,
            relation: nodeMetas.group,
            title: nodeLinkTitle,
            hidden: nodeMetas.hidden,
        });
    }

    return connectedNodesList;
}

function backToCenterView() {
    network.visualisation.fit({ animation: true });
}

function switchNode(nodeId, mustZoom = true) {

    var nodeMetas = getNodeMetas(nodeId);

    if (nodeMetas == false) { return false; }

    network.visualisation.selectNodes([nodeId]);
    network.selectedNode = Number(nodeId);

    // renommer la page web
    document.title = nodeMetas.label + ' - Otetosphère';

    if (mustZoom) {zoomToNode(nodeId);}

    fiche.fill();
    fiche.open();

    return true;
}