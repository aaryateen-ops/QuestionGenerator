import pytest
from app.engine.bloom_classifier import BloomClassifierEngine

@pytest.mark.parametrize("question_text, expected_level", [
    # L1: Remember
    ("Define an Abstract Data Type and list two examples.", "L1"),
    ("State the properties of a strictly binary tree.", "L1"),
    ("List four applications of the stack data structure.", "L1"),
    ("Identify the difference between static and dynamic hashing.", "L1"),
    ("What is meant by balance factor in an AVL tree?", "L1"),
    
    # L2: Understand
    ("Explain why B-Trees are preferred over standard BSTs for database indexing.", "L2"),
    ("Describe the in-order traversal procedure for obtaining sorted keys.", "L2"),
    ("Illustrate the working of a circular queue with an overflow example.", "L2"),
    ("Discuss the significance of topological sorting in task scheduling.", "L2"),
    
    # L3: Apply
    ("Calculate the single-source shortest path using Dijkstra's algorithm for the graph.", "L3"),
    ("Convert the infix expression (A + B) * C into its postfix equivalent.", "L3"),
    ("Solve the linear system using Gaussian elimination.", "L3"),
    ("Demonstrate the bottom-up heapify algorithm for the given array.", "L3"),
    ("Compute the hash index for key 45 using division hashing with m=11.", "L3"),
    
    # L4: Analyze
    ("Compare and contrast array-based and pointer-based implementations of Stacks.", "L4"),
    ("Differentiate between LL and LR rotations in an AVL tree with diagrams.", "L4"),
    ("Analyze the Floyd-Warshall all-pairs shortest path recurrence relation.", "L4"),
    ("Deconstruct the worst-case time complexity of QuickSort with Lomuto partition.", "L4"),
    
    # L5: Evaluate
    ("Justify why Dijkstra's algorithm fails when negative weight edges exist.", "L5"),
    ("Critically assess the suitability of Splay Trees versus AVL Trees in caching.", "L5"),
    ("Evaluate the time and space complexity trade-offs between MergeSort and QuickSort.", "L5"),
    ("Validate the optimal substructure property of the 0/1 Knapsack problem.", "L5"),
    
    # L6: Create
    ("Design an algorithm to detect and remove a loop in a singly linked list.", "L6"),
    ("Formulate a dynamic programming recurrence for the Longest Common Subsequence.", "L6"),
    ("Design an optimal Huffman Tree for the given character frequency distribution.", "L6"),
    ("Devise a collision-resistant Hash Table utilizing double hashing.", "L6")
])
def test_bloom_classifier_taxonomy_accuracy(question_text, expected_level):
    result = BloomClassifierEngine.classify(question_text)
    assert result["predicted_bloom_level"] == expected_level, (
        f"Failed for '{question_text}': predicted {result['predicted_bloom_level']} "
        f"({result['level_name']}), expected {expected_level}. Rationale: {result['rationale']}"
    )
    assert result["confidence_score"] >= 0.70
    assert result["primary_verb"] is not None

def test_compound_verb_resolution():
    # Question with both "Explain" (L2) and "Calculate" (L3)
    q = "Explain the working of Dijkstra's algorithm and calculate the shortest path for the graph."
    res = BloomClassifierEngine.classify(q)
    # The higher cognitive imperative verb (calculate -> L3) should take precedence or be recognized
    assert res["predicted_bloom_level"] in ["L3", "L2"]
    assert len(res["detected_verbs"]) >= 2
