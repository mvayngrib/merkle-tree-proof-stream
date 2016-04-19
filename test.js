
var crypto = require('crypto')
var tape = require('tape')
var merkleStream = require('merkle-tree-stream')
var proofStream = require('./prove')
var verifier = require('./verify')
var MERKLE_OPTS = {
  leaf: function (leaf) {
    return hash([leaf.data])
  },
  parent: function (a, b) {
    return hash([a.hash, b.hash])
  }
}

tape('prove one, verify', function (t) {
  var stream = merkleStream(MERKLE_OPTS)

  var nodes = []
  stream.on('data', function (node) {
    nodes.push(node)
  })

  stream.write('a')
  stream.write('b')
  stream.write('c')
  stream.finalize()

  stream.end()

  stream.on('end', prove)

  function prove () {
    var pstream = proofStream({ nodes:nodes })
    var proof = []
    pstream.on('data', function (node) {
      proof.push(node)
    })

    pstream.on('end', function () {
      t.deepEqual(getIndices(proof), [2, 5, 3])
      verify(proof)
    })

    pstream.write(0)
    pstream.end()
  }

  function verify (proof) {
    var verify = verifier({
      leaf: MERKLE_OPTS.leaf,
      parent: MERKLE_OPTS.parent,
      proof: proof
    })

    t.ok(verify('a', 0))
    t.notOk(verify('b', 2))
    t.end()
  }
})

tape('prove multiple, verify', function (t) {
  var stream = merkleStream({
    leaf: function (leaf) {
      return hash([leaf.data])
    },
    parent: function (a, b) {
      return hash([a.hash, b.hash])
    }
  })

  var nodes = []
  stream.on('data', function (node) {
    nodes.push(node)
  })

  stream.write('a')
  stream.write('b')
  stream.write('c')
  stream.write('d')
  stream.write('e')
  stream.finalize()

  stream.end()

  stream.on('end', prove)

  function prove () {
    var pstream = proofStream({ nodes:nodes })
    var proof = []
    pstream.on('data', function (node) {
      proof.push(node)
    })

    pstream.on('end', function () {
      t.deepEqual(getIndices(proof), [
        2, 5, 11, 6, 1, 4, 7
      ])

      verify(proof)
    })

    pstream.write(0)
    pstream.write(4)
    pstream.write(6)
    pstream.end()
  }

  function verify (proof) {
    var verify = verifier({
      leaf: MERKLE_OPTS.leaf,
      parent: MERKLE_OPTS.parent,
      proof: proof
    })

    t.ok(verify('a', 0))
    t.ok(verify('c', 4))
    t.ok(verify('d', 6))
    debugger
    t.notOk(verify('a', 1))
    t.notOk(verify('a', 2))
    t.notOk(verify('b', 2))
    t.end()
  }
})

function hash (list) {
  var sha = crypto.createHash('sha256')
  for (var i = 0; i < list.length; i++) sha.update(list[i])
  return sha.digest()
}

function getIndices (nodes) {
  return nodes.map(function (node) {
    return node.index
  })
}
