package com.yogesh.automation.dataStructure;

public class ArrayFindMissingNumber {

	public static void main(String[] args) {
		System.out.println("hello world");

		int[] arr = { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15 };
		System.out.println("missing element is " + getMissingEle(arr));

	}

	/**
	 * Problem - You have an array, find the missing element
	 */

	/**
	 * Algorithm Get the sum of all the elements calculated sum - total expected sum
	 * provides the missing element
	 */

	private static int totalSum(int[] arr) {
		int len = arr.length;
		int sum = 0;
		for (int i = 0; i < len; i++) {
			sum += arr[i];
		}
		System.out.println("totalSum " + sum);

		return sum;
	}

	private static int sum(int[] arr) {
		int eLen;
		int eSum = 0;
		if (arr[0] == 0) {
			eLen = arr.length;
		} else {
			eLen = arr.length + 1;
		}
		for (int i = 1; i <= eLen; i++) {
			eSum += i;
		}
		System.out.println("eSum " + eSum);
		return eSum;
	}

	private static int getMissingEle(int[] arr) {
		return sum(arr) - totalSum(arr);
	}

}
