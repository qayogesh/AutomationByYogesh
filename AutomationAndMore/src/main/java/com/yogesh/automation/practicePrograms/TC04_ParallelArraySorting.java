package com.yogesh.automation.practicePrograms;

import java.util.Arrays;

/**
 * @author YOGESH
 *
 */
public class TC04_ParallelArraySorting {

	public static void main(String[] args) {

		/**
		 * Problem definition Given I have an array of integers And I want it in
		 * Ascending order
		 */

		// Steps
		// 1. define Array
		// 2. User Array static method Parallel sort

		int[] sortingArray = { 3, 45, 2, 0, 1, 399, -5 };
		for (int i : sortingArray) {
			System.out.println(i);
		}

		// Sorting Array in ascending order
		Arrays.parallelSort(sortingArray);
		System.out.println("\nSee parallel ascending sorting as in below ");
		for (int i : sortingArray) {
			System.out.println(i);
		}

		// Sorting Array in descending order
		System.out.println("\nSee parallel descending sorting as in below ");
		System.out.println("sortingArray.length " + sortingArray.length);
		System.out.println("sortingArray.length " + sortingArray.length);
		for (int i = sortingArray.length-1; i >= 0; i--) {
			System.out.println(sortingArray[i]);
		}

	}

}
