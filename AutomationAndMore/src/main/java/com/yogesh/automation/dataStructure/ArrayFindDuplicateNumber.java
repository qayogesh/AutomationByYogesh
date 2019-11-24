package com.yogesh.automation.dataStructure;

public class ArrayFindDuplicateNumber {

	public static void main(String[] args) {
		int[] arr = { 1, 2, 3, 3 };
		ArrayFindDuplicateNumber obj = new ArrayFindDuplicateNumber();
		int misssing = obj.getActualSum(arr) - obj.getXpectedSum(arr);
		System.out.println("Duplicate element " + misssing);

	}

	/**
	 * Find duplicate number in a series
	 * 
	 * algorithm Get the array count and add length by 1, sum them, this is your
	 * expected sum Get the array sum and minus from expected sum. This is the
	 * duplicate element
	 */

	public int getActualSum(int[] arr) {
		int aSum = 0;
		int len = arr.length;
		for (int i = 0; i < len; i++) {
			aSum += i;
		}
		System.out.println("actual sum " + aSum);
		return aSum;
	}

	public int getXpectedSum(int[] arr) {
		int xSum = 0;
		int len = arr.length - 1;

		for (int i = 0; i < len; i++) {
			xSum += i;
		}
		System.out.println("xpected sum " + xSum);

		return xSum;
	}

}